import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const timesheet = await prisma.timesheet.findUnique({
    where: { id },
    include: {
      client: { select: { name: true } },
      carer: {
        select: { name: true, idNumber: true, contactNumber: true },
      },
      entries: { orderBy: { day: "asc" } },
      photos: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!timesheet) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const role = (session.user as Record<string, unknown>).role as string;
  if (role !== "ADMIN" && timesheet.carerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(timesheet);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || (session.user as Record<string, unknown>).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  // Entries and photos cascade-delete via schema
  await prisma.timesheet.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
