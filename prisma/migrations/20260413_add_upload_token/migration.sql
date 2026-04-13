-- AlterTable
ALTER TABLE "User" ADD COLUMN "uploadToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_uploadToken_key" ON "User"("uploadToken");
