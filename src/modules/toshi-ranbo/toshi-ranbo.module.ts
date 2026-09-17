import { Module } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service';
import { R2StorageService } from '../../shared/r2-storage.service';
import { GamesController } from './games.controller';
import { GamesService } from './games.service';
import { PlayersController } from './players.controller';
import { PlayersService } from './players.service';
import { LeaderboardController } from './leaderboard.controller';
import { LeaderboardService } from './leaderboard.service';

@Module({
  controllers: [GamesController, PlayersController, LeaderboardController],
  providers: [
    PrismaService,
    R2StorageService,
    GamesService,
    PlayersService,
    LeaderboardService,
  ],
  exports: [GamesService, PlayersService, LeaderboardService],
})
export class ToshiRanboModule {}
