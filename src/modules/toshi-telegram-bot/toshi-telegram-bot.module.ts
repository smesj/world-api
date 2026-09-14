import { Module } from '@nestjs/common';
import { ToshiRanboModule } from '../toshi-ranbo/toshi-ranbo.module';
import { ToshiTelegramBotService } from './toshi-telegram-bot.service';
import { GameInterpreterService } from './game-interpreter.service';
import { PendingConfirmationStore } from './pending-confirmation.store';

// No controller — this module has no HTTP surface of its own. It calls
// ToshiRanboModule's GamesService/PlayersService directly in-process
// (imported below) rather than over HTTP, and talks to Telegram via long
// polling started from ToshiTelegramBotService's onModuleInit.
//
// Named toshi-telegram-bot (not just telegram-bot) so a future bot for a
// different game/domain gets its own sibling module instead of overloading
// this one.
@Module({
  imports: [ToshiRanboModule],
  providers: [
    ToshiTelegramBotService,
    GameInterpreterService,
    PendingConfirmationStore,
  ],
})
export class ToshiTelegramBotModule {}
