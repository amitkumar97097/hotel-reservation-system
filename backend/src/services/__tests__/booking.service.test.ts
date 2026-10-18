import { describe, expect, it } from "vitest";
import { BookingError, createBooking } from "../booking.service.js";

describe("createBooking input validation", () => {
  it("rejects an invalid room ID", async () => {
    await expect(
      createBooking({
        roomId: "invalid-room-id",
        guestName: "Test Guest",
        guestEmail: "test@example.com",
        checkIn: "2026-10-20",
        checkOut: "2026-10-23",
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
        guestName: "Test Guest",
        guestEmail: "not-an-email",
        checkIn: "2026-10-20",
        checkOut: "2026-10-23",
        guests: 2,
      }),
    ).rejects.toBeInstanceOf(BookingError);
  });

  it("rejects checkout before check-in", async () => {
    await expect(
      createBooking({
        roomId: "6ad509b4a6028c553af77652",
        guestName: "Test Guest",
        guestEmail: "test@example.com",
        checkIn: "2026-10-23",
        checkOut: "2026-10-20",
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
        guestName: "Test Guest",
        guestEmail: "test@example.com",
        checkIn: "2026-10-20",
        checkOut: "2026-10-23",
        guests: 0,
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Guests must be a positive integer",
    });
  });
});
