import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || (session.user as Record<string, unknown>).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const timesheet = await prisma.timesheet.findUnique({ where: { id } });
  if (!timesheet) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (timesheet.status === "APPROVED") {
    return NextResponse.json(
      { error: "Timesheet is already approved" },
      { status: 400 }
    );
  }

  const updated = await prisma.timesheet.update({
    where: { id },
    data: {
      status: "APPROVED",
      reviewedById: session.user.id,
      reviewComment: body.comment || null,
      reviewedAt: new Date(),
    },
  });

  return NextResponse.json(updated);
}
