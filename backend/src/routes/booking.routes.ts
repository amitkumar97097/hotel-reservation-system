import { Router } from "express";
import { z } from "zod";
import { BookingError, createBooking } from "../services/booking.service.js";

const bookingRouter = Router();

const createBookingSchema = z.object({
  roomId: z.string().min(1),
  guestName: z.string().trim().min(1).max(100),
  guestEmail: z.string().trim().email().max(254),
  checkIn: z.string(),
  checkOut: z.string(),
  guests: z.number().int().positive(),
});

bookingRouter.post("/", async (req, res, next) => {
  try {
    const input = createBookingSchema.parse(req.body);
    const booking = await createBooking(input);

    res.status(201).json({
      success: true,
      data: booking,
    });
  } catch (error: unknown) {
    if (error instanceof BookingError) {
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: "BOOKING_ERROR",
          message: error.message,
        },
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
