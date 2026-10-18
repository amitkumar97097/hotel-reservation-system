import mongoose from "mongoose";
import { z } from "zod";
import { Booking } from "../models/Booking.js";
import { Room } from "../models/Room.js";

const roomTypeSchema = z.enum(["standard", "deluxe", "suite"]);

export const createRoomSchema = z.object({
  roomNumber: z.string().trim().min(1).max(20),
  type: roomTypeSchema,
  capacity: z.number().int().min(1).max(20),
  pricePerNight: z.number().finite().min(0).max(1_000_000),
});

export interface ListRoomsInput {
  page: number;
  limit: number;
  type?: "standard" | "deluxe" | "suite" | undefined;
}

export class RoomError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "RoomError";
  }
}

export async function createRoom(input: z.infer<typeof createRoomSchema>) {
  const roomNumber = input.roomNumber.trim();

  const existingRoom = await Room.findOne({ roomNumber }).lean();

  if (existingRoom) {
    throw new RoomError("Room number already exists", 409);
  }

  try {
    const room = await Room.create({
      ...input,
      roomNumber,
      isActive: true,
    });

    return room.toObject();
  } catch (error: unknown) {
    if (error instanceof mongoose.Error && error.name === "ValidationError") {
      throw new RoomError("Invalid room details", 400);
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      throw new RoomError("Room number already exists", 409);
    }

    throw error;
  }
}

export async function listRooms(input: ListRoomsInput) {
  const { page, limit, type } = input;

  const filter: {
    isActive: boolean;
    type?: "standard" | "deluxe" | "suite";
  } = { isActive: true };

  if (type) {
    filter.type = type;
  }

  const [rooms, total] = await Promise.all([
    Room.find(filter)
      .select("roomNumber type capacity pricePerNight isActive createdAt updatedAt")
      .sort({ roomNumber: 1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Room.countDocuments(filter),
  ]);

  return {
    rooms,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getRoomById(id: string) {
  if (!mongoose.isValidObjectId(id)) {
    throw new RoomError("Invalid room ID", 400);
  }

  const room = await Room.findOne({
    _id: id,
    isActive: true,
  }).lean();

  if (!room) {
    throw new RoomError("Room not found", 404);
  }

  return room;
}

export async function getAvailableRooms(
  checkInValue: string,
  checkOutValue: string,
  guests: number,
) {
  const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

  const checkInResult = dateSchema.safeParse(checkInValue);
  const checkOutResult = dateSchema.safeParse(checkOutValue);

  if (!checkInResult.success || !checkOutResult.success) {
    throw new RoomError("Dates must use YYYY-MM-DD format", 400);
  }

  const checkIn = new Date(`${checkInValue}T00:00:00.000Z`);
  const checkOut = new Date(`${checkOutValue}T00:00:00.000Z`);

  if (
    Number.isNaN(checkIn.getTime()) ||
    Number.isNaN(checkOut.getTime()) ||
    checkIn.toISOString().slice(0, 10) !== checkInValue ||
    checkOut.toISOString().slice(0, 10) !== checkOutValue
  ) {
    throw new RoomError("Invalid check-in or check-out date", 400);
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  if (checkIn < today) {
    throw new RoomError("Check-in cannot be in the past", 400);
  }

  if (checkOut <= checkIn) {
    throw new RoomError("Check-out must be after check-in", 400);
  }

  if (!Number.isSafeInteger(guests) || guests < 1 || guests > 20) {
    throw new RoomError("Guests must be an integer between 1 and 20", 400);
  }

  const conflictingBookings = await Booking.find({
    status: "confirmed",
    checkIn: { $lt: checkOut },
    checkOut: { $gt: checkIn },
  })
    .distinct("room")
    .exec();

  const rooms = await Room.find({
    isActive: true,
    capacity: { $gte: guests },
    _id: { $nin: conflictingBookings },
  })
    .select("roomNumber type capacity pricePerNight")
    .sort({ pricePerNight: 1, roomNumber: 1 })
    .limit(100)
    .lean();

  return {
    checkIn: checkInValue,
    checkOut: checkOutValue,
    guests,
    rooms,
    count: rooms.length,
  };
}
