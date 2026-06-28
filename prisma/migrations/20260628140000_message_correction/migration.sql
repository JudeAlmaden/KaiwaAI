-- AlterTable: store grammar feedback (Correction JSON) on Kai's reply message
ALTER TABLE "Message" ADD COLUMN     "correction" TEXT;
