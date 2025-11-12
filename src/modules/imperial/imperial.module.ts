import { Module } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service';
import { GamesController } from './games.controller';
import { GamesService } from './games.service';

@Module({
  controllers: [GamesController],
  providers: [PrismaService, GamesService],
  exports: [GamesService],
})
export class ImperialModule {}
