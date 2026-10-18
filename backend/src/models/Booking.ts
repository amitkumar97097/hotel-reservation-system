import mongoose, { Schema, type InferSchemaType } from "mongoose";

const bookingSchema = new Schema(
  {
    bookingReference: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    guestName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    guestEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    room: {
      type: Schema.Types.ObjectId,
      ref: "Room",
      required: true,
      index: true,
    },
    checkIn: {
      type: Date,
      required: true,
    },
    checkOut: {
      type: Date,
      required: true,
    },
    guests: {
      type: Number,
      required: true,
      min: 1,
    },
    pricePerNight: {
      type: Number,
      required: true,
      min: 0,
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["confirmed", "cancelled"],
      default: "confirmed",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

bookingSchema.index({ room: 1, checkIn: 1, checkOut: 1, status: 1 });

export type BookingDocument = InferSchemaType<typeof bookingSchema>;

export const Booking = mongoose.model("Booking", bookingSchema);
