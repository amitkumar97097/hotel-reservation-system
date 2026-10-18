import mongoose, { Schema, type InferSchemaType } from "mongoose";

const roomSchema = new Schema(
  {
    roomNumber: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    type: {
      type: String,
      enum: ["standard", "deluxe", "suite"],
      required: true,
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
    },
    pricePerNight: {
      type: Number,
      required: true,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    bookingVersion: {
      type: Number,
      default: 0,
      select: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export type RoomDocument = InferSchemaType<typeof roomSchema>;

export const Room = mongoose.model("Room", roomSchema);
