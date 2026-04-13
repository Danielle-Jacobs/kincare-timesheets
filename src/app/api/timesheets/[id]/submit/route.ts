import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const timesheet = await prisma.timesheet.findUnique({
    where: { id },
    include: { entries: true },
  });

  if (!timesheet) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (timesheet.carerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (timesheet.status !== "DRAFT" && timesheet.status !== "REJECTED") {
    return NextResponse.json(
      { error: "Timesheet cannot be submitted in its current state" },
      { status: 400 }
    );
  }

  // Check that at least one entry has clock times
  const validEntries = timesheet.entries.filter(
    (e) => e.clockIn && e.clockOut
  );
  if (validEntries.length === 0) {
    return NextResponse.json(
      { error: "Please add at least one day with clock in and out times" },
      { status: 400 }
    );
  }

  const updated = await prisma.timesheet.update({
    where: { id },
    data: {
      status: "SUBMITTED",
      submittedAt: new Date(),
    },
  });

  return NextResponse.json(updated);
}
