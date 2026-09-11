-- AlterEnum
ALTER TYPE "GameType" ADD VALUE 'TOSHI_RANBO';

-- CreateTable
CREATE TABLE "ToshiRanboGame" (
    "id" SERIAL NOT NULL,
    "gameId" INTEGER NOT NULL,
    "cardsPlayed" INTEGER,

    CONSTRAINT "ToshiRanboGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToshiRanboScore" (
    "id" SERIAL NOT NULL,
    "gameId" INTEGER NOT NULL,
    "playerId" TEXT NOT NULL,
    "clan" TEXT NOT NULL,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "fightWin1f" BOOLEAN NOT NULL DEFAULT false,
    "fightWin2f" BOOLEAN NOT NULL DEFAULT false,
    "threeVillages" BOOLEAN NOT NULL DEFAULT false,
    "firstToshiRanbo" BOOLEAN NOT NULL DEFAULT false,
    "twoShrines" BOOLEAN NOT NULL DEFAULT false,
    "threeNobleActions" BOOLEAN NOT NULL DEFAULT false,
    "twoBuildings" BOOLEAN NOT NULL DEFAULT false,
    "threeTactics" BOOLEAN NOT NULL DEFAULT false,
    "clanGoal1" BOOLEAN NOT NULL DEFAULT false,
    "clanGoal2" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ToshiRanboScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ToshiRanboGame_gameId_key" ON "ToshiRanboGame"("gameId");

-- CreateIndex
CREATE INDEX "ToshiRanboGame_gameId_idx" ON "ToshiRanboGame"("gameId");

-- CreateIndex
CREATE INDEX "ToshiRanboScore_gameId_idx" ON "ToshiRanboScore"("gameId");

-- CreateIndex
CREATE INDEX "ToshiRanboScore_playerId_idx" ON "ToshiRanboScore"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "ToshiRanboScore_gameId_playerId_key" ON "ToshiRanboScore"("gameId", "playerId");

-- AddForeignKey
ALTER TABLE "ToshiRanboGame" ADD CONSTRAINT "ToshiRanboGame_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToshiRanboScore" ADD CONSTRAINT "ToshiRanboScore_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToshiRanboScore" ADD CONSTRAINT "ToshiRanboScore_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
