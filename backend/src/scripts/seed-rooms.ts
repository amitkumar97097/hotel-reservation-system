import mongoose from "mongoose";
import { env } from "../config/env.js";
import { Room } from "../models/Room.js";

const TARGET_ROOM_COUNT = 100;
const START_ROOM_NUMBER = 101;

async function seedRooms(): Promise<void> {
  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 10_000 });

  try {
    const existingCount = await Room.countDocuments({});
    if (existingCount >= TARGET_ROOM_COUNT) {
      console.info(`Inventory already contains ${existingCount} rooms; nothing to add.`);
      return;
    }

    const existingNumbers = new Set(
      await Room.distinct("roomNumber").then((numbers) => numbers.map(String)),
    );
    const roomsToCreate: Array<{
      roomNumber: string;
      type: "standard" | "deluxe" | "suite";
      capacity: number;
      pricePerNight: number;
      isActive: boolean;
    }> = [];

    let nextNumber = START_ROOM_NUMBER;
    let sequence = existingCount;

    while (existingCount + roomsToCreate.length < TARGET_ROOM_COUNT) {
      const roomNumber = String(nextNumber++);
      if (existingNumbers.has(roomNumber)) continue;

      const type = sequence % 10 < 5 ? "standard" : sequence % 10 < 8 ? "deluxe" : "suite";
      roomsToCreate.push({
        roomNumber,
        type,
        capacity: type === "standard" ? 2 : type === "deluxe" ? 3 : 4,
        pricePerNight: type === "standard" ? 2500 : type === "deluxe" ? 4000 : 7000,
        isActive: true,
      });
      sequence += 1;
    }

    await Room.insertMany(roomsToCreate, { ordered: true });
    const finalCount = await Room.countDocuments({});
    console.info(`Created ${roomsToCreate.length} rooms. Total inventory: ${finalCount}.`);
  } finally {
    await mongoose.disconnect();
  }
}

seedRooms().catch((error: unknown) => {
  console.error("Room seeding failed:", error);
  process.exitCode = 1;
});
