/*
  Warnings:

  - Changed the type of `playerId` on the `ToshiRanboScore` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "ToshiRanboScore" DROP CONSTRAINT "ToshiRanboScore_playerId_fkey";

-- AlterTable
ALTER TABLE "ToshiRanboScore" DROP COLUMN "playerId",
ADD COLUMN     "playerId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "ToshiRanboPlayer" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ToshiRanboPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ToshiRanboPlayer_name_key" ON "ToshiRanboPlayer"("name");

-- CreateIndex
CREATE INDEX "ToshiRanboPlayer_name_idx" ON "ToshiRanboPlayer"("name");

-- CreateIndex
CREATE INDEX "ToshiRanboScore_playerId_idx" ON "ToshiRanboScore"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "ToshiRanboScore_gameId_playerId_key" ON "ToshiRanboScore"("gameId", "playerId");

-- AddForeignKey
ALTER TABLE "ToshiRanboScore" ADD CONSTRAINT "ToshiRanboScore_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "ToshiRanboPlayer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
