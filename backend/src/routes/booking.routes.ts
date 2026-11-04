import { Router } from "express";
import { z } from "zod";
import { authenticate, type AuthContext } from "../middleware/auth.middleware.js";
import { User } from "../models/User.js";
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

export { bookingRouter };
