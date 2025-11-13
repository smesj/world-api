import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { PrismaService } from '../../shared/prisma.service';
import { TimerController } from './timer.controller';
import { TimerService } from './timer.service';
import { TimerGateway } from './timer.gateway';
import { GamesController } from './games.controller';
import { GamesService } from './games.service';

@Module({
  imports: [
    CacheModule.register({
      ttl: 360000, // 6 minutes in milliseconds
      max: 100, // Maximum number of items in cache
    }),
  ],
  controllers: [TimerController, GamesController],
  providers: [PrismaService, TimerService, TimerGateway, GamesService],
  exports: [TimerService, GamesService],
})
export class FootyModule {}
