import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { IdentityModule } from './modules/identity/identity.module';
import { FootyModule } from './modules/footy/footy.module';
import { ImperialModule } from './modules/imperial/imperial.module';
import { ToshiRanboModule } from './modules/toshi-ranbo/toshi-ranbo.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { ToshiTelegramBotModule } from './modules/toshi-telegram-bot/toshi-telegram-bot.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    IdentityModule,
    FootyModule,
    ImperialModule,
    ToshiRanboModule,
    WebhooksModule,
    ToshiTelegramBotModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
