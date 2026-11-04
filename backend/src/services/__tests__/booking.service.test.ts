import { describe, expect, it } from "vitest";
import { BookingError, createBooking } from "../booking.service.js";

function futureDateOffset(days: number): string {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

describe("createBooking input validation", () => {
  it("rejects an invalid room ID", async () => {
    await expect(
      createBooking({
        roomId: "invalid-room-id",
        userId: "507f1f77bcf86cd799439011",
        guestName: "Test Guest",
        guestEmail: "test@example.com",
        checkIn: futureDateOffset(2),
        checkOut: futureDateOffset(5),
        guests: 2,
      }),
    ).rejects.toMatchObject({
      name: "BookingError",
      statusCode: 400,
      message: "Invalid room ID",
    });
  });

  it("rejects an invalid email", async () => {
    await expect(
      createBooking({
        roomId: "6ad509b4a6028c553af77652",
        userId: "507f1f77bcf86cd799439011",
        guestName: "Test Guest",
        guestEmail: "not-an-email",
        checkIn: futureDateOffset(2),
        checkOut: futureDateOffset(5),
        guests: 2,
      }),
    ).rejects.toBeInstanceOf(BookingError);
  });

  it("rejects checkout before check-in", async () => {
    await expect(
      createBooking({
        roomId: "6ad509b4a6028c553af77652",
        userId: "507f1f77bcf86cd799439011",
        guestName: "Test Guest",
        guestEmail: "test@example.com",
        checkIn: futureDateOffset(10),
        checkOut: futureDateOffset(8),
        guests: 2,
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Check-out must be after check-in",
    });
  });

  it("rejects zero guests", async () => {
    await expect(
      createBooking({
        roomId: "6ad509b4a6028c553af77652",
        userId: "507f1f77bcf86cd799439011",
        guestName: "Test Guest",
        guestEmail: "test@example.com",
        checkIn: futureDateOffset(2),
        checkOut: futureDateOffset(5),
        guests: 0,
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Guests must be a positive integer",
    });
  });
});
