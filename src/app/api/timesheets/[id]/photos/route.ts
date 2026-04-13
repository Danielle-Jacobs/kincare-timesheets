import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const timesheet = await prisma.timesheet.findUnique({
    where: { id },
    select: { carerId: true, status: true },
  });

  if (!timesheet) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (timesheet.carerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (timesheet.status !== "DRAFT" && timesheet.status !== "REJECTED") {
    return NextResponse.json(
      { error: "Cannot upload photos to a submitted timesheet" },
      { status: 400 }
    );
  }

  const formData = await req.formData();
  const file = formData.get("photo") as File | null;

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

  const ext = file.name.split(".").pop() || "jpg";
  const filename = `${randomUUID()}.${ext}`;
  const timesheetDir = path.join(UPLOAD_DIR, id);

  await mkdir(timesheetDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  const filePath = path.join(timesheetDir, filename);
  await writeFile(filePath, buffer);

  const photo = await prisma.timesheetPhoto.create({
    data: {
      filename: file.name,
      path: `${id}/${filename}`,
      timesheetId: id,
    },
  });

  return NextResponse.json(photo, { status: 201 });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const photoId = searchParams.get("photoId");

  if (!photoId) {
    return NextResponse.json({ error: "photoId required" }, { status: 400 });
  }

  const photo = await prisma.timesheetPhoto.findUnique({
    where: { id: photoId },
    include: { timesheet: { select: { carerId: true, status: true } } },
  });

  if (!photo || photo.timesheetId !== id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (photo.timesheet.carerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

  // Remove file from disk
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
