import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");

// GET: return carer info + client list (public, token-authenticated)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const carer = await prisma.user.findUnique({
    where: { uploadToken: token },
    select: { id: true, name: true, active: true },
  });

  if (!carer || !carer.active) {
    return NextResponse.json({ error: "Invalid link" }, { status: 404 });
  }

  const clients = await prisma.client.findMany({
    where: {
      active: true,
      carerClients: { some: { carerId: carer.id } },
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  // Get this carer's existing photos grouped by timesheet
  const timesheets = await prisma.timesheet.findMany({
    where: { carerId: carer.id },
    select: {
      id: true,
      month: true,
      year: true,
      status: true,
      client: { select: { id: true, name: true } },
      photos: { orderBy: { createdAt: "asc" } },
    },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  return NextResponse.json({
    carer: { name: carer.name },
    clients,
    timesheets,
  });
}

// POST: upload a photo (public, token-authenticated)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const carer = await prisma.user.findUnique({
    where: { uploadToken: token },
    select: { id: true, active: true },
  });

  if (!carer || !carer.active) {
    return NextResponse.json({ error: "Invalid link" }, { status: 404 });
  }

  const formData = await req.formData();
  const file = formData.get("photo") as File | null;
  const clientId = formData.get("clientId") as string | null;
  const month = Number(formData.get("month"));
  const year = Number(formData.get("year"));

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "Only image files are allowed" },
      { status: 400 }
    );
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json(
      { error: "File too large (max 10MB)" },
      { status: 400 }
    );
  }

  if (!clientId || !month || !year) {
    return NextResponse.json(
      { error: "Client, month, and year are required" },
      { status: 400 }
    );
  }

  // Verify carer is assigned to this client
  const assignment = await prisma.carerClient.findUnique({
    where: {
      carerId_clientId: { carerId: carer.id, clientId },
    },
  });
  if (!assignment) {
    return NextResponse.json(
      { error: "You are not assigned to this client" },
      { status: 403 }
    );
  }

  // Find or create the timesheet
  let timesheet = await prisma.timesheet.findUnique({
    where: {
      carerId_clientId_month_year: {
        carerId: carer.id,
        clientId,
        month,
        year,
      },
    },
  });

  if (!timesheet) {
    timesheet = await prisma.timesheet.create({
      data: {
        carerId: carer.id,
        clientId,
        month,
        year,
        status: "DRAFT",
      },
    });
  }

  if (timesheet.status !== "DRAFT" && timesheet.status !== "REJECTED") {
    return NextResponse.json(
      { error: "This timesheet has already been submitted" },
      { status: 400 }
    );
  }

  // Save file to disk
  const ext = file.name.split(".").pop() || "jpg";
  const filename = `${randomUUID()}.${ext}`;
  const timesheetDir = path.join(UPLOAD_DIR, timesheet.id);
  await mkdir(timesheetDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(timesheetDir, filename), buffer);

  const photo = await prisma.timesheetPhoto.create({
    data: {
      filename: file.name,
      path: `${timesheet.id}/${filename}`,
      timesheetId: timesheet.id,
    },
  });

  return NextResponse.json(photo, { status: 201 });
}

// DELETE: remove a photo (public, token-authenticated)
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const carer = await prisma.user.findUnique({
    where: { uploadToken: token },
    select: { id: true, active: true },
  });

  if (!carer || !carer.active) {
    return NextResponse.json({ error: "Invalid link" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const photoId = searchParams.get("photoId");

  if (!photoId) {
    return NextResponse.json({ error: "photoId required" }, { status: 400 });
  }

  const photo = await prisma.timesheetPhoto.findUnique({
    where: { id: photoId },
    include: { timesheet: { select: { carerId: true, status: true } } },
  });

  if (!photo || photo.timesheet.carerId !== carer.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (
    photo.timesheet.status !== "DRAFT" &&
    photo.timesheet.status !== "REJECTED"
  ) {
    return NextResponse.json(
      { error: "Cannot delete photos from a submitted timesheet" },
      { status: 400 }
    );
  }

  const { unlink } = await import("fs/promises");
  const filePath = path.join(UPLOAD_DIR, photo.path);
  try {
    await unlink(filePath);
  } catch {
    // File may already be gone
  }

  await prisma.timesheetPhoto.delete({ where: { id: photoId } });

  return NextResponse.json({ ok: true });
}
