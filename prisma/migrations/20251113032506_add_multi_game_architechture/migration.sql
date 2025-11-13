/*
  Warnings:

  - The primary key for the `FootyGame` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `completedAt` on the `FootyGame` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `FootyGame` table. All the data in the column will be lost.
  - You are about to drop the column `createdById` on the `FootyGame` table. All the data in the column will be lost.
  - You are about to drop the column `startedAt` on the `FootyGame` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `FootyGame` table. All the data in the column will be lost.
  - You are about to drop the column `team1Player1` on the `FootyGame` table. All the data in the column will be lost.
  - You are about to drop the column `team1Player2` on the `FootyGame` table. All the data in the column will be lost.
  - You are about to drop the column `team1Score` on the `FootyGame` table. All the data in the column will be lost.
  - You are about to drop the column `team2Player1` on the `FootyGame` table. All the data in the column will be lost.
  - You are about to drop the column `team2Player2` on the `FootyGame` table. All the data in the column will be lost.
  - You are about to drop the column `team2Score` on the `FootyGame` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `FootyGame` table. All the data in the column will be lost.
  - The `id` column on the `FootyGame` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[gameId]` on the table `FootyGame` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `gameId` to the `FootyGame` table without a default value. This is not possible if the table is not empty.
  - Made the column `duration` on table `FootyGame` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "GameType" AS ENUM ('FOOTY', 'IMPERIAL');

-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'ABANDONED');

-- DropForeignKey
ALTER TABLE "FootyGame" DROP CONSTRAINT "FootyGame_createdById_fkey";

-- DropIndex
DROP INDEX "FootyGame_createdById_idx";

-- DropIndex
DROP INDEX "FootyGame_status_idx";

-- AlterTable
ALTER TABLE "FootyGame" DROP CONSTRAINT "FootyGame_pkey",
DROP COLUMN "completedAt",
DROP COLUMN "createdAt",
DROP COLUMN "createdById",
DROP COLUMN "startedAt",
DROP COLUMN "status",
DROP COLUMN "team1Player1",
DROP COLUMN "team1Player2",
DROP COLUMN "team1Score",
DROP COLUMN "team2Player1",
DROP COLUMN "team2Player2",
DROP COLUMN "team2Score",
DROP COLUMN "updatedAt",
ADD COLUMN     "gameId" INTEGER NOT NULL,
ADD COLUMN     "scoreTeamA" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "scoreTeamB" INTEGER NOT NULL DEFAULT 0,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ALTER COLUMN "duration" SET NOT NULL,
ALTER COLUMN "duration" SET DEFAULT 360000,
ADD CONSTRAINT "FootyGame_pkey" PRIMARY KEY ("id");

-- CreateTable
CREATE TABLE "Game" (
    "id" SERIAL NOT NULL,
    "type" "GameType" NOT NULL DEFAULT 'FOOTY',
    "status" "GameStatus" NOT NULL DEFAULT 'PENDING',
    "seasonId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameParticipation" (
    "id" SERIAL NOT NULL,
    "gameId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "stats" JSONB,

    CONSTRAINT "GameParticipation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Game_type_idx" ON "Game"("type");

-- CreateIndex
CREATE INDEX "Game_status_idx" ON "Game"("status");

-- CreateIndex
CREATE INDEX "Game_createdAt_idx" ON "Game"("createdAt");

-- CreateIndex
CREATE INDEX "GameParticipation_userId_idx" ON "GameParticipation"("userId");

-- CreateIndex
CREATE INDEX "GameParticipation_gameId_idx" ON "GameParticipation"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "GameParticipation_gameId_userId_role_key" ON "GameParticipation"("gameId", "userId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "FootyGame_gameId_key" ON "FootyGame"("gameId");

-- CreateIndex
CREATE INDEX "FootyGame_gameId_idx" ON "FootyGame"("gameId");

-- AddForeignKey
ALTER TABLE "GameParticipation" ADD CONSTRAINT "GameParticipation_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameParticipation" ADD CONSTRAINT "GameParticipation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FootyGame" ADD CONSTRAINT "FootyGame_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
