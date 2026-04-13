import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { hashSync } from "bcryptjs";
import { randomUUID } from "crypto";
import path from "node:path";

const dbPath = path.resolve(__dirname, "..", "dev.db");
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: "admin@kincare.co.za" },
    update: {},
    create: {
      email: "admin@kincare.co.za",
      name: "Admin User",
      password: hashSync("admin123", 10),
      role: "ADMIN",
    },
  });

  const carer1Token = randomUUID();
  const carer1 = await prisma.user.upsert({
    where: { email: "sarah@kincare.co.za" },
    update: { uploadToken: carer1Token },
    create: {
      email: "sarah@kincare.co.za",
      name: "Sarah Johnson",
      password: hashSync("carer123", 10),
      role: "CARER",
      uploadToken: carer1Token,
      idNumber: "9501015800084",
      contactNumber: "072 123 4567",
    },
  });

  const carer2Token = randomUUID();
  const carer2 = await prisma.user.upsert({
    where: { email: "thabo@kincare.co.za" },
    update: { uploadToken: carer2Token },
    create: {
      email: "thabo@kincare.co.za",
      name: "Thabo Molefe",
      password: hashSync("carer123", 10),
      role: "CARER",
      uploadToken: carer2Token,
      idNumber: "8803025800085",
      contactNumber: "083 987 6543",
    },
  });

  const client1 = await prisma.client.upsert({
    where: { id: "client-1" },
    update: {},
    create: {
      id: "client-1",
      name: "Mrs. Margaret van der Merwe",
      address: "12 Oak Street, Sandton",
      phone: "011 234 5678",
    },
  });

  const client2 = await prisma.client.upsert({
    where: { id: "client-2" },
    update: {},
    create: {
      id: "client-2",
      name: "Mr. James Naidoo",
      address: "45 Palm Avenue, Durbanville",
      phone: "021 345 6789",
    },
  });

  const client3 = await prisma.client.upsert({
    where: { id: "client-3" },
    update: {},
    create: {
      id: "client-3",
      name: "Mrs. Elizabeth Smith",
      address: "8 Rose Lane, Constantia",
      phone: "021 456 7890",
    },
  });

  console.log("Seeded successfully:", {
    admin: admin.email,
    carer1: carer1.email,
    carer2: carer2.email,
    client1: client1.name,
    client2: client2.name,
    client3: client3.name,
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
