import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json([], { status: 401 });

  const role = (session.user as Record<string, unknown>).role as string;
  const where =
    role === "ADMIN" ? {} : { carerId: session.user.id };

  const timesheets = await prisma.timesheet.findMany({
    where,
    include: {
      client: { select: { name: true } },
      carer: { select: { name: true } },
      photos: { select: { id: true, path: true, createdAt: true }, orderBy: { createdAt: "desc" } },
      _count: { select: { photos: true, entries: true } },
    },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  return NextResponse.json(timesheets);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Verify carer is assigned to this client
  const role = (session.user as Record<string, unknown>).role as string;
  if (role !== "ADMIN") {
    const assignment = await prisma.carerClient.findUnique({
      where: {
        carerId_clientId: {
          carerId: session.user.id,
          clientId: body.clientId,
        },
      },
    });
    if (!assignment) {
      return NextResponse.json(
        { error: "You are not assigned to this client" },
        { status: 403 }
      );
    }
  }

  // Check for existing timesheet
  const existing = await prisma.timesheet.findUnique({
    where: {
      carerId_clientId_month_year: {
        carerId: session.user.id,
        clientId: body.clientId,
        month: body.month,
        year: body.year,
      },
    },
  });

  if (existing) {
    return NextResponse.json(existing);
  }

  const timesheet = await prisma.timesheet.create({
    data: {
      carerId: session.user.id,
      clientId: body.clientId,
      month: body.month,
      year: body.year,
    },
  });

  return NextResponse.json(timesheet);
}
