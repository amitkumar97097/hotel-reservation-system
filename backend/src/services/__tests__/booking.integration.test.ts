import mongoose from "mongoose";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { Booking } from "../../models/Booking.js";
import { Room } from "../../models/Room.js";
import { BookingError, createBooking } from "../booking.service.js";

const TEST_MONGODB_URI =
  "mongodb://127.0.0.1:27017/hotel_reservation_test?replicaSet=rs0";

beforeAll(async () => {
  await mongoose.connect(TEST_MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
  });
}, 15000);

afterEach(async () => {
  await Booking.deleteMany({});
  await Room.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
});

function dateOffset(days: number): string {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function createTestRoom() {
  return Room.create({
    roomNumber: "101",
    type: "deluxe",
    capacity: 2,
    pricePerNight: 2500,
    isActive: true,
  });
}

function bookingDates(offset = 2) {
  return {
    checkIn: dateOffset(offset),
    checkOut: dateOffset(offset + 3),
  };
}

describe("Booking integration tests", () => {
  it("persists a booking and calculates the total price", async () => {
    const room = await createTestRoom();

    const booking = await createBooking({
      ...bookingDates(),
      roomId: room.id,
      guestName: "Test Guest",
      guestEmail: "test@example.com",
      guests: 2,
    });

    expect(booking.bookingReference).toMatch(/^HTL-/);
    expect(booking.totalPrice).toBe(7500);
    expect(booking.status).toBe("confirmed");

    const savedBooking = await Booking.findById(booking._id);

    expect(savedBooking).not.toBeNull();
    expect(savedBooking?.guestEmail).toBe("test@example.com");
  });

  it("rejects overlapping bookings for the same room", async () => {
    const room = await createTestRoom();
    const dates = bookingDates();

    await createBooking({
      ...dates,
      roomId: room.id,
      guestName: "First Guest",
      guestEmail: "first@example.com",
      guests: 2,
    });

    await expect(
      createBooking({
        ...dates,
        roomId: room.id,
        guestName: "Second Guest",
        guestEmail: "second@example.com",
        guests: 2,
      }),
    ).rejects.toMatchObject({
      name: "BookingError",
      statusCode: 409,
      message: "Room is unavailable for the selected dates",
    });

    expect(await Booking.countDocuments()).toBe(1);
  });

  it("allows non-overlapping bookings for the same room", async () => {
    const room = await createTestRoom();

    await createBooking({
      ...bookingDates(2),
      roomId: room.id,
      guestName: "First Guest",
      guestEmail: "first@example.com",
      guests: 2,
    });

    const secondBooking = await createBooking({
      ...bookingDates(5),
      roomId: room.id,
      guestName: "Next Guest",
      guestEmail: "next@example.com",
      guests: 2,
    });

    expect(secondBooking.status).toBe("confirmed");
    expect(await Booking.countDocuments()).toBe(2);
  });

  it("allows only one simultaneous overlapping booking", async () => {
    const room = await createTestRoom();
    const dates = bookingDates();

    const results = await Promise.allSettled([
      createBooking({
        ...dates,
        roomId: room.id,
        guestName: "Concurrent Guest One",
        guestEmail: "one@example.com",
        guests: 2,
      }),
      createBooking({
        ...dates,
        roomId: room.id,
        guestName: "Concurrent Guest Two",
        guestEmail: "two@example.com",
        guests: 2,
      }),
    ]);

    const successful = results.filter((result) => result.status === "fulfilled");

    const failed = results.filter((result) => result.status === "rejected");

    expect(successful).toHaveLength(1);
    expect(failed).toHaveLength(1);

    if (failed[0]?.status === "rejected") {
      expect(failed[0].reason).toBeInstanceOf(BookingError);
      expect(failed[0].reason.statusCode).toBe(409);
    }

    expect(await Booking.countDocuments({ status: "confirmed" })).toBe(1);
  });
});
