import { Router } from "express";
import { z } from "zod";
import { authenticate, type AuthContext } from "../middleware/auth.middleware.js";
import { User } from "../models/User.js";
import { Booking } from "../models/Booking.js";
import { BookingError, createBooking } from "../services/booking.service.js";

const bookingRouter = Router();

const createBookingSchema = z.object({
  roomId: z.string().min(1),
  checkIn: z.string(),
  checkOut: z.string(),
  guests: z.number().int().positive(),
});

bookingRouter.post("/", authenticate, async (req, res, next) => {
  try {
    const input = createBookingSchema.parse(req.body);
    const auth = res.locals.auth as AuthContext;
    const user = await User.findById(auth.userId).select("name email isActive");

    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Account is unavailable" },
      });
      return;
    }

    const booking = await createBooking({
      ...input,
      userId: auth.userId,
      guestName: user.name,
      guestEmail: user.email,
    });

    res.status(201).json({ success: true, data: booking });
  } catch (error: unknown) {
    if (error instanceof BookingError) {
      res.status(error.statusCode).json({
        success: false,
        error: { code: "BOOKING_ERROR", message: error.message },
      });
      return;
    }

    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid booking input",
          details: error.issues,
        },
      });
      return;
    }

    next(error);
  }
});

// A customer can only view their own reservations.
bookingRouter.get("/mine", authenticate, async (_req, res, next) => {
  try {
    const auth = res.locals.auth as AuthContext;
    const bookings = await Booking.find({ user: auth.userId })
      .populate("room", "roomNumber type capacity pricePerNight")
      .sort({ createdAt: -1 })
      .lean();
    res.status(200).json({ success: true, data: bookings });
  } catch (error) {
    next(error);
  }
});

// Cancellation is restricted to the booking owner or an administrator.
bookingRouter.patch("/:id/cancel", authenticate, async (req, res, next) => {
  try {
    const auth = res.locals.auth as AuthContext;
    const filter =
      auth.role === "admin"
        ? { _id: req.params.id, status: "confirmed" }
        : { _id: req.params.id, user: auth.userId, status: "confirmed" };
    const booking = await Booking.findOneAndUpdate(
      filter,
      { $set: { status: "cancelled" } },
      { new: true, runValidators: true },
    ).populate("room", "roomNumber type");
    if (!booking) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Active booking not found" },
      });
      return;
    }
    res.status(200).json({ success: true, data: booking });
  } catch (error) { next(error); }
});

// Administrator-only reservation overview.
bookingRouter.get("/admin/all", authenticate, async (_req, res, next) => {
  try {
    const auth = res.locals.auth as AuthContext;
    if (auth.role !== "admin") {
      res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "Administrator access is required" },
      });
      return;
    }
    const bookings = await Booking.find()
      .populate("room", "roomNumber type")
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();
    res.status(200).json({ success: true, data: bookings });
  } catch (error) { next(error); }
});

function pdfEscape(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/[^\x20-\x7E]/g, "?");
}

function createInvoicePdf(lines: string[]): Buffer {
  const commands = ["BT", "/F1 16 Tf", "50 790 Td", "(StayPilot - Booking Invoice) Tj", "/F1 11 Tf"];
  for (const line of lines) commands.push("0 -24 Td", `(${pdfEscape(line)}) Tj`);
  commands.push("ET");
  const stream = commands.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(stream, "ascii")} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(pdf, "ascii")); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf, "ascii");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, "ascii");
}

bookingRouter.get("/:id/invoice", authenticate, async (req, res, next) => {
  try {
    const auth = res.locals.auth as AuthContext;
    const filter =
      auth.role === "admin"
        ? { _id: req.params.id }
        : { _id: req.params.id, user: auth.userId };
    const booking = await Booking.findOne(filter)
      .populate("room", "roomNumber type")
      .lean();
    if (!booking) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Booking not found" } });
      return;
    }
    const room = booking.room as unknown as { roomNumber?: string; type?: string };
    const lines = [
      `Booking reference: ${booking.bookingReference}`,
      `Guest: ${booking.guestName}`,
      `Email: ${booking.guestEmail}`,
      `Room: ${room?.roomNumber ?? "N/A"} (${room?.type ?? "Room"})`,
      `Check-in: ${new Date(booking.checkIn).toISOString().slice(0, 10)}`,
      `Check-out: ${new Date(booking.checkOut).toISOString().slice(0, 10)}`,
      `Guests: ${booking.guests}`,
      `Price per night: INR ${booking.pricePerNight}`,
      `Total: INR ${booking.totalPrice}`,
      `Booking status: ${booking.status}`,
      "Payment: Pay at hotel / not collected online",
    ];
    const pdf = createInvoicePdf(lines);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="invoice-${booking.bookingReference}.pdf"`);
    res.status(200).send(pdf);
  } catch (error) { next(error); }
});

export { bookingRouter };
