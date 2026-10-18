import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { app } from "../../app.js";
import { Room } from "../../models/Room.js";
import { Booking } from "../../models/Booking.js";

let mongo: MongoMemoryReplSet | undefined;

beforeAll(async () => {
  mongo = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
  });

  await mongoose.connect(mongo.getUri(), {
    serverSelectionTimeoutMS: 5000,
  });
}, 60000);

afterEach(async () => {
  await Booking.deleteMany({});
  await Room.deleteMany({});
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  if (mongo) {
    await mongo.stop();
  }
}, 30000);

describe("Hotel Reservation API", () => {
  it("returns a healthy status", async () => {
    const response = await request(app).get("/api/v1/health");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe("ok");
  });

  it("creates a room through the API", async () => {
    const response = await request(app).post("/api/v1/rooms").send({
      roomNumber: "API-101",
      type: "deluxe",
      capacity: 2,
      pricePerNight: 2500,
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.roomNumber).toBe("API-101");
  });

  it("lists rooms through the API", async () => {
    await Room.create({
      roomNumber: "API-102",
      type: "standard",
      capacity: 2,
      pricePerNight: 1500,
    });

    const response = await request(app).get("/api/v1/rooms");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.rooms).toHaveLength(1);
  });

  it("rejects an invalid room payload", async () => {
    const response = await request(app).post("/api/v1/rooms").send({
      roomNumber: "",
      type: "invalid",
      capacity: 0,
      pricePerNight: -100,
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 404 for an unknown API endpoint", async () => {
    const response = await request(app).get("/api/v1/unknown");

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });
});
