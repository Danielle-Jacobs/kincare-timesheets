import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashSync } from "bcryptjs";
import { randomUUID } from "crypto";

export async function GET() {
  const session = await auth();
  if (!session || (session.user as Record<string, unknown>).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const carers = await prisma.user.findMany({
    where: { role: "CARER" },
    select: {
      id: true,
      name: true,
      email: true,
      idNumber: true,
      contactNumber: true,
      uploadToken: true,
      active: true,
      carerClients: {
        include: { client: { select: { id: true, name: true } } },
      },
    },
    orderBy: { name: "asc" },
  });

  const result = carers.map(({ carerClients, ...carer }) => ({
    ...carer,
    clients: carerClients.map((cc) => cc.client),
  }));

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || (session.user as Record<string, unknown>).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();

  const existing = await prisma.user.findUnique({
    where: { email: body.email },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Email already in use" },
      { status: 400 }
    );
  }

  const uploadToken = randomUUID();

  const carer = await prisma.user.create({
    data: {
      email: body.email,
      name: body.name,
      password: hashSync(body.password, 10),
      role: "CARER",
      uploadToken,
      idNumber: body.idNumber || null,
      contactNumber: body.contactNumber || null,
    },
  });

  return NextResponse.json({
    id: carer.id,
    name: carer.name,
    email: carer.email,
    uploadToken: carer.uploadToken,
  });
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

  const timesheetCount = await prisma.timesheet.count({
    where: { carerId: id },
  });
  if (timesheetCount > 0) {
    return NextResponse.json(
      { error: `Cannot delete — ${timesheetCount} timesheet(s) linked to this carer` },
      { status: 400 }
    );
  }

  await prisma.carerClient.deleteMany({ where: { carerId: id } });
  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
