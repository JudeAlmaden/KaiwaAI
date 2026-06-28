-- AlterTable
ALTER TABLE "GroupMember" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'accepted';

-- AlterTable
ALTER TABLE "Memory" ADD COLUMN     "personaId" TEXT;

-- CreateIndex
CREATE INDEX "Memory_userId_personaId_idx" ON "Memory"("userId", "personaId");

-- AddForeignKey
ALTER TABLE "Memory" ADD CONSTRAINT "Memory_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE CASCADE ON UPDATE CASCADE;
