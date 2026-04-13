import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { timesheetId, entries } = body;

  // Verify ownership
  const timesheet = await prisma.timesheet.findUnique({
    where: { id: timesheetId },
  });

  if (!timesheet) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (timesheet.carerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (timesheet.status !== "DRAFT" && timesheet.status !== "REJECTED") {
    return NextResponse.json(
      { error: "Timesheet is locked" },
      { status: 400 }
    );
  }

  // Upsert each entry
  const results = await Promise.all(
    entries.map(
      (entry: {
        day: number;
        clockIn?: string | null;
        clockOut?: string | null;
        carerSignature?: string | null;
        clientSignature?: string | null;
        notes?: string | null;
      }) => {
        const data: Record<string, unknown> = {};
        if ("clockIn" in entry) data.clockIn = entry.clockIn;
        if ("clockOut" in entry) data.clockOut = entry.clockOut;
        if ("carerSignature" in entry) {
          data.carerSignature = entry.carerSignature;
          if (entry.carerSignature) data.carerSignedAt = new Date();
        }
        if ("clientSignature" in entry) {
          data.clientSignature = entry.clientSignature;
          if (entry.clientSignature) data.clientSignedAt = new Date();
        }
        if ("notes" in entry) data.notes = entry.notes;

        return prisma.timesheetEntry.upsert({
          where: {
            timesheetId_day: {
              timesheetId,
              day: entry.day,
            },
          },
          create: {
            timesheetId,
            day: entry.day,
            ...data,
          } as Parameters<typeof prisma.timesheetEntry.upsert>[0]["create"],
          update: data as Parameters<typeof prisma.timesheetEntry.upsert>[0]["update"],
        });
      }
    )
  );

  return NextResponse.json(results);
}
