import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import { Booking } from "../models/Booking.js";
import { Room } from "../models/Room.js";

export interface CreateBookingInput {
  roomId: string;
  guestName: string;
  guestEmail: string;
  checkIn: string;
  checkOut: string;
  guests: number;
}

export class BookingError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "BookingError";
  }
}

function parseDate(value: string, field: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new BookingError(`${field} must use YYYY-MM-DD format`, 400);
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new BookingError(`${field} is not a valid date`, 400);
  }

  return date;
}

export async function createBooking(input: CreateBookingInput) {
  if (!mongoose.isValidObjectId(input.roomId)) {
    throw new BookingError("Invalid room ID", 400);
  }

  const guestName = input.guestName.trim();
  const guestEmail = input.guestEmail.trim().toLowerCase();

  if (!guestName || guestName.length > 100) {
    throw new BookingError("Guest name is required (max 100 characters)", 400);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail) || guestEmail.length > 254) {
    throw new BookingError("A valid guest email is required", 400);
  }

  if (!Number.isSafeInteger(input.guests) || input.guests < 1) {
    throw new BookingError("Guests must be a positive integer", 400);
  }

  const checkIn = parseDate(input.checkIn, "checkIn");
  const checkOut = parseDate(input.checkOut, "checkOut");

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  if (checkIn < today) {
    throw new BookingError("Check-in cannot be in the past", 400);
  }

  if (checkOut <= checkIn) {
    throw new BookingError("Check-out must be after check-in", 400);
  }

  const nights = (checkOut.getTime() - checkIn.getTime()) / 86_400_000;

  const session = await mongoose.startSession();

  try {
    let createdBooking: ReturnType<typeof Booking.prototype.toObject> | undefined;

    await session.withTransaction(async () => {
      // Concurrent transactions for the same room contend
      // on the same room document.
      const room = await Room.findOneAndUpdate(
        { _id: input.roomId, isActive: true },
        { $inc: { bookingVersion: 1 } },
        { new: true, session },
      );

      if (!room) {
        throw new BookingError("Room not found or inactive", 404);
      }

      if (input.guests > room.capacity) {
        throw new BookingError("Guest count exceeds room capacity", 400);
      }

      const overlappingBooking = await Booking.findOne({
        room: room._id,
        status: "confirmed",
        checkIn: { $lt: checkOut },
        checkOut: { $gt: checkIn },
      }).session(session);

      if (overlappingBooking) {
        throw new BookingError("Room is unavailable for the selected dates", 409);
      }

      const totalPrice = room.pricePerNight * nights;

      if (!Number.isSafeInteger(totalPrice) || totalPrice < 0) {
        throw new BookingError("Invalid booking total", 400);
      }

      const [booking] = await Booking.create(
        [
          {
            bookingReference: `HTL-${randomUUID().slice(0, 8).toUpperCase()}`,
            guestName,
            guestEmail,
            room: room._id,
            checkIn,
            checkOut,
            guests: input.guests,
            pricePerNight: room.pricePerNight,
            totalPrice,
            status: "confirmed",
          },
        ],
        { session },
      );

      if (!booking) {
        throw new Error("Booking creation returned no document");
      }

      createdBooking = booking.toObject();
    });

    if (!createdBooking) {
      throw new Error("Booking transaction completed without a result");
    }

    return createdBooking;
  } finally {
    await session.endSession();
  }
}
