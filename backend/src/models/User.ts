import { Schema, model, type InferSchemaType } from "mongoose";

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
      unique: true,
      index: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
      required: true,
      index: true,
    },
    isActive: { type: Boolean, default: true, required: true },
  },
  { timestamps: true, versionKey: false },
);

export type UserDocument = InferSchemaType<typeof userSchema>;
export const User = model("User", userSchema);
