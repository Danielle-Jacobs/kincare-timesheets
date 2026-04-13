import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: body.name,
      idNumber: body.idNumber || null,
      contactNumber: body.contactNumber || null,
    },
  });

  return NextResponse.json({ name: updated.name, idNumber: updated.idNumber, contactNumber: updated.contactNumber });
}
