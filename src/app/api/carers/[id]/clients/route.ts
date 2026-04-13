import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || (session.user as Record<string, unknown>).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  const assignments = await prisma.carerClient.findMany({
    where: { carerId: id },
    include: { client: { select: { id: true, name: true } } },
  });

  return NextResponse.json(assignments.map((a) => a.client));
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || (session.user as Record<string, unknown>).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const { clientIds } = (await req.json()) as { clientIds: string[] };

  await prisma.$transaction([
    prisma.carerClient.deleteMany({ where: { carerId: id } }),
    prisma.carerClient.createMany({
      data: clientIds.map((clientId) => ({ carerId: id, clientId })),
    }),
  ]);

  return NextResponse.json({ ok: true });
}
