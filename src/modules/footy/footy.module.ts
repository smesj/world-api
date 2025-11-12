import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { PrismaService } from '../../shared/prisma.service';
import { TimerController } from './timer.controller';
import { TimerService } from './timer.service';
import { TimerGateway } from './timer.gateway';

@Module({
  imports: [
    CacheModule.register({
      ttl: 360000, // 6 minutes in milliseconds
      max: 100, // Maximum number of items in cache
    }),
  ],
  controllers: [TimerController],
  providers: [PrismaService, TimerService, TimerGateway],
  exports: [TimerService],
})
export class FootyModule {}
