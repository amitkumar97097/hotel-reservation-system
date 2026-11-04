import { Router } from "express";
import { z } from "zod";
import { authenticate, type AuthContext } from "../middleware/auth.middleware.js";
import { User } from "../models/User.js";
import { Booking } from "../models/Booking.js";
import { BookingError, createBooking } from "../services/booking.service.js";

const bookingRouter = Router();

const createBookingSchema = z.object({
  roomId: z.string().min(1),
  checkIn: z.string(),
  checkOut: z.string(),
  guests: z.number().int().positive(),
});

bookingRouter.post("/", authenticate, async (req, res, next) => {
  try {
    const input = createBookingSchema.parse(req.body);
    const auth = res.locals.auth as AuthContext;
    const user = await User.findById(auth.userId).select("name email isActive");

    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Account is unavailable" },
      });
      return;
    }

    const booking = await createBooking({
      ...input,
      userId: auth.userId,
      guestName: user.name,
      guestEmail: user.email,
    });

    res.status(201).json({ success: true, data: booking });
  } catch (error: unknown) {
    if (error instanceof BookingError) {
      res.status(error.statusCode).json({
        success: false,
        error: { code: "BOOKING_ERROR", message: error.message },
      });
      return;
    }

    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid booking input",
          details: error.issues,
        },
      });
      return;
    }

    next(error);
  }
});


// A customer can only view their own reservations.
bookingRouter.get("/mine", authenticate, async (_req, res, next) => {
  try {
    const auth = res.locals.auth as AuthContext;
    const bookings = await Booking.find({ user: auth.userId })
      .populate("room", "roomNumber type capacity pricePerNight")
      .sort({ createdAt: -1 })
      .lean();
    res.status(200).json({ success: true, data: bookings });
  } catch (error) { next(error); }
});

// Cancellation is restricted to the booking owner or an administrator.
bookingRouter.patch("/:id/cancel", authenticate, async (req, res, next) => {
  try {
    const auth = res.locals.auth as AuthContext;
    const filter = auth.role === "admin"
      ? { _id: req.params.id, status: "confirmed" }
      : { _id: req.params.id, user: auth.userId, status: "confirmed" };
    const booking = await Booking.findOneAndUpdate(
      filter,
      { $set: { status: "cancelled" } },
      { new: true, runValidators: true },
    ).populate("room", "roomNumber type");
    if (!booking) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Active booking not found" } });
      return;
    }
    res.status(200).json({ success: true, data: booking });
  } catch (error) { next(error); }
});

// Administrator-only reservation overview.
bookingRouter.get("/admin/all", authenticate, async (_req, res, next) => {
  try {
    const auth = res.locals.auth as AuthContext;
    if (auth.role !== "admin") {
      res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Administrator access is required" } });
      return;
    }
    const bookings = await Booking.find()
      .populate("room", "roomNumber type")
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();
    res.status(200).json({ success: true, data: bookings });
  } catch (error) { next(error); }
});

export { bookingRouter };
