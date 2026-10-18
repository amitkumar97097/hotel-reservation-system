import { Router } from "express";
import { z } from "zod";
import {
  createRoom,
  createRoomSchema,
  getAvailableRooms,
  getRoomById,
  listRooms,
  RoomError,
} from "../services/room.service.js";

const roomRouter = Router();

const listRoomsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.enum(["standard", "deluxe", "suite"]).optional(),
});

const availabilitySchema = z.object({
  checkIn: z.string(),
  checkOut: z.string(),
  guests: z.coerce.number().int().min(1).max(20),
});

function handleRouteError(
  error: unknown,
  res: Parameters<Parameters<typeof roomRouter.get>[1]>[1],
) {
  if (error instanceof RoomError) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        code: "ROOM_ERROR",
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
        message: "Invalid request parameters",
        details: error.issues,
      },
    });
    return;
  }

  console.error("Room API error:", error);

  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred",
    },
  });
}

roomRouter.post("/", async (req, res) => {
  try {
    const input = createRoomSchema.parse(req.body);
    const room = await createRoom(input);

    res.status(201).json({
      success: true,
      data: room,
    });
  } catch (error: unknown) {
    handleRouteError(error, res);
  }
});

roomRouter.get("/", async (req, res) => {
  try {
    const query = listRoomsSchema.parse(req.query);
    const result = await listRooms(query);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    handleRouteError(error, res);
  }
});

roomRouter.get("/availability", async (req, res) => {
  try {
    const query = availabilitySchema.parse(req.query);

    const result = await getAvailableRooms(query.checkIn, query.checkOut, query.guests);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    handleRouteError(error, res);
  }
});

roomRouter.get("/:id", async (req, res) => {
  try {
    const room = await getRoomById(req.params.id);

    res.status(200).json({
      success: true,
      data: room,
    });
  } catch (error: unknown) {
    handleRouteError(error, res);
  }
});

export { roomRouter };
