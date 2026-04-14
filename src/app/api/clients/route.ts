import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json([], { status: 401 });

  const role = (session.user as Record<string, unknown>).role as string;

  const clients = await prisma.client.findMany({
    where: {
      active: true,
      ...(role !== "ADMIN" && {
        carerClients: { some: { carerId: session.user.id } },
      }),
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(clients);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || (session.user as Record<string, unknown>).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const client = await prisma.client.create({
    data: {
      name: body.name,
      address: body.address || null,
      phone: body.phone || null,
    },
  });

  return NextResponse.json(client);
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session || (session.user as Record<string, unknown>).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  // Check for linked timesheets
  const timesheetCount = await prisma.timesheet.count({
    where: { clientId: id },
  });
  if (timesheetCount > 0) {
    return NextResponse.json(
      { error: `Cannot delete — ${timesheetCount} timesheet(s) linked to this client` },
      { status: 400 }
    );
  }

  await prisma.carerClient.deleteMany({ where: { clientId: id } });
  await prisma.client.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
