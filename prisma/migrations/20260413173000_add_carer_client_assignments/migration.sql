-- CreateTable
CREATE TABLE "CarerClient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "carerId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CarerClient_carerId_fkey" FOREIGN KEY ("carerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CarerClient_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CarerClient_carerId_idx" ON "CarerClient"("carerId");

-- CreateIndex
CREATE INDEX "CarerClient_clientId_idx" ON "CarerClient"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "CarerClient_carerId_clientId_key" ON "CarerClient"("carerId", "clientId");
