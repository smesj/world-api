import { Module } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service';
import { R2StorageService } from '../../shared/r2-storage.service';
import { GamesController } from './games.controller';
import { GamesService } from './games.service';
import { PlayersController } from './players.controller';
import { PlayersService } from './players.service';

@Module({
  controllers: [GamesController, PlayersController],
  providers: [PrismaService, R2StorageService, GamesService, PlayersService],
  exports: [GamesService, PlayersService],
})
export class ToshiRanboModule {}
