import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { Bot, InlineKeyboard, Context, GrammyError, HttpError } from 'grammy';
import { Readable } from 'stream';
import Anthropic from '@anthropic-ai/sdk';
import { GamesService } from '../toshi-ranbo/games.service';
import { PlayersService } from '../toshi-ranbo/players.service';
import {
  GameInterpreterService,
  DecodedGame,
} from './game-interpreter.service';
import {
  PendingConfirmationStore,
  PendingResult,
} from './pending-confirmation.store';
import { SCORE_FLAG_KEYS } from './shorthand-table';

const FLAG_LABELS: Record<(typeof SCORE_FLAG_KEYS)[number], string> = {
  fightWin1f: 'First Fight Win',
  fightWin2f: 'Second Fight Win',
  threeVillages: '3 Villages',
  firstToshiRanbo: 'First Toshi Ranbo',
  heldToshiRanbo: 'Held Toshi Ranbo',
  twoShrines: '2 Shrines',
  threeNobleActions: '3 Noble Actions',
  twoBuildings: '2 Buildings',
  threeTactics: '3 Tactics',
  clanGoal1: 'First Clan Goal',
  clanGoal2: 'Second Clan Goal',
};

type PhotoSizes = NonNullable<NonNullable<Context['message']>['photo']>;

function mimetypeAndExtension(filePath: string | undefined): {
  mimetype: string;
  extension: string;
} {
  const ext = (filePath?.split('.').pop() ?? '').toLowerCase();
  switch (ext) {
    case 'png':
      return { mimetype: 'image/png', extension: 'png' };
    case 'webp':
      return { mimetype: 'image/webp', extension: 'webp' };
    case 'gif':
      return { mimetype: 'image/gif', extension: 'gif' };
    default:
      // Telegram re-encodes uploaded photos as JPEG server-side, so this is
      // the overwhelmingly common case.
      return { mimetype: 'image/jpeg', extension: 'jpg' };
  }
}

// Listens in a single allow-listed Telegram group. Group privacy mode only
// guarantees delivery of two things — commands, and replies to the bot's own
// messages (see .claude-context.md for how we learned that the hard way) —
// so the flow is built entirely on those: run /game, then reply to the
// bot's prompt with the photo (scores in its caption). Decodes the scores
// via Claude and posts a Confirm/Cancel prompt back into the group before
// saving anything. Runs long polling (getUpdates) rather than a webhook —
// no extra Cloudflare tunnel route needed, and world-api is already an
// always-on process.
@Injectable()
export class ToshiTelegramBotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ToshiTelegramBotService.name);
  private bot: Bot | null = null;
  private readonly allowedChatId = process.env.TELEGRAM_ALLOWED_CHAT_ID
    ? Number(process.env.TELEGRAM_ALLOWED_CHAT_ID)
    : null;

  constructor(
    private readonly interpreter: GameInterpreterService,
    private readonly gamesService: GamesService,
    private readonly playersService: PlayersService,
    private readonly pendingStore: PendingConfirmationStore,
  ) {}

  async onModuleInit() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      this.logger.warn(
        'TELEGRAM_BOT_TOKEN is not set — Telegram bot will not start',
      );
      return;
    }
    if (!this.allowedChatId) {
      this.logger.warn(
        'TELEGRAM_ALLOWED_CHAT_ID is not set — the bot would respond in ANY chat it is added to. Use the /chatid command in the target group to find the right value.',
      );
    }

    const bot = new Bot(token);
    this.bot = bot;

    await bot.init();
    this.logger.log(`Telegram bot @${bot.botInfo.username} initialized`);

    bot.command('chatid', async (ctx) => {
      await ctx.reply(`Chat ID: ${ctx.chat.id}`);
    });

    bot.command('game', async (ctx) => {
      if (!ctx.chat || !this.isAllowedChat(ctx.chat.id)) return;
      await ctx.reply(
        '📋 Reply to THIS message with the game photo — put the scores in its caption (same shorthand as always).',
      );
    });

    bot.on('message:photo', (ctx) => this.handleGameMessage(ctx));

    // Reply-to-bot with text but no photo — nudge toward attaching one.
    bot.on('message:text', (ctx) => this.handleTextMessage(ctx));

    bot.on('callback_query:data', (ctx) => this.handleConfirmation(ctx));

    bot.catch((err) => {
      const { ctx } = err;
      if (err.error instanceof GrammyError) {
        this.logger.error(
          `Telegram API error for update ${ctx.update.update_id}: ${err.error.description}`,
        );
      } else if (err.error instanceof HttpError) {
        this.logger.error(`Could not reach Telegram: ${String(err.error)}`);
      } else {
        this.logger.error(`Unknown bot error: ${String(err.error)}`);
      }
    });

    // Long polling runs until stop() is called — don't await it here.
    bot.start().catch((err) => {
      this.logger.error(`Telegram bot stopped unexpectedly: ${err}`);
    });
  }

  async onModuleDestroy() {
    await this.bot?.stop();
  }

  private isAllowedChat(chatId: number): boolean {
    if (!this.allowedChatId) return true; // no allow-list configured — dev fallback
    return chatId === this.allowedChatId;
  }

  // Group privacy mode only guarantees delivery of replies to the bot's own
  // previous messages (plus commands, handled separately) — a reply to some
  // other user's message is not delivered to us at all, confirmed by testing
  // Sep 2026. So this is the actual gate for "was this deliberately directed
  // at me," not an @mention check.
  private isReplyToBot(message: {
    reply_to_message?: { from?: { id: number } };
  }): boolean {
    return message.reply_to_message?.from?.id === this.bot?.botInfo.id;
  }

  private stripMention(caption: string): string {
    const username = this.bot?.botInfo.username;
    if (!username) return caption.trim();
    return caption.replace(new RegExp(`@${username}\\b`, 'gi'), '').trim();
  }

  // Someone replied to the bot with text but no photo attached — the only
  // thing left to do is ask for one. (A reply *with* a photo attached is a
  // message:photo update, not message:text, and goes to handleGameMessage.)
  private async handleTextMessage(ctx: Context) {
    const message = ctx.message;
    if (!message?.text || !ctx.chat) return;
    if (!this.isReplyToBot(message) || !this.isAllowedChat(ctx.chat.id)) return;

    this.logger.log(
      `Text reply to bot (no photo) in chat ${ctx.chat.id}: ${JSON.stringify(message.text)}`,
    );
    await ctx.reply(
      'I need a photo attached to this reply — run /game again, then reply to that prompt with the board photo (scores in its caption).',
      { reply_parameters: { message_id: message.message_id } },
    );
  }

  // Primary entry point: a reply to the bot's own /game prompt (or any past
  // bot message — Telegram doesn't distinguish which one), with the board
  // photo attached and the scores in its caption.
  private async handleGameMessage(ctx: Context) {
    const message = ctx.message;
    if (!message?.photo || !ctx.chat) return;
    if (!this.isReplyToBot(message)) {
      this.logger.debug(
        `Ignoring photo in chat ${ctx.chat.id} — not a reply to the bot`,
      );
      return;
    }

    this.logger.log(
      `Photo reply to bot received in chat ${ctx.chat.id}, caption: ${JSON.stringify(message.caption ?? '')}`,
    );

    if (!this.isAllowedChat(ctx.chat.id)) {
      this.logger.warn(
        `Ignoring photo message from unlisted chat ${ctx.chat.id} (allowed: ${this.allowedChatId})`,
      );
      return;
    }

    await this.processGameSubmission(
      ctx,
      ctx.chat.id,
      message.photo,
      message.caption ?? '',
      message.message_id,
    );
  }

  private async processGameSubmission(
    ctx: Context,
    chatId: number,
    photos: PhotoSizes,
    rawText: string,
    replyToMessageId: number,
  ) {
    const captionText = this.stripMention(rawText);
    if (!captionText) {
      await ctx.reply(
        "I see the photo, but no score text with it — include the game's scores (same shorthand as always) and reply again.",
        { reply_parameters: { message_id: replyToMessageId } },
      );
      return;
    }

    if (!this.interpreter.isConfigured) {
      await ctx.reply(
        'Game interpretation is not configured on the server yet (missing ANTHROPIC_API_KEY) — ask an admin to set it up.',
        { reply_parameters: { message_id: replyToMessageId } },
      );
      return;
    }

    let decoded: DecodedGame;
    try {
      decoded = await this.interpreter.decode(captionText);
    } catch (error) {
      this.logger.error(`Claude decode failed: ${error}`);
      const detail =
        error instanceof Anthropic.APIError
          ? error.message
          : 'unexpected error';
      await ctx.reply(
        `Couldn't interpret that message (${detail}). Try again in a moment.`,
        { reply_parameters: { message_id: replyToMessageId } },
      );
      return;
    }

    if (decoded.unresolvedCodes.length > 0) {
      await ctx.reply(
        `I didn't recognize these codes, so I'm not guessing: ${decoded.unresolvedCodes.join(', ')}\n` +
          `Run /game again and reply with the corrected scores before I record anything.`,
        { reply_parameters: { message_id: replyToMessageId } },
      );
      return;
    }

    const roster = await this.playersService.findAll();
    const byName = new Map(roster.map((p) => [p.name.trim().toLowerCase(), p]));

    const unmatchedNames: string[] = [];
    const results: PendingResult[] = [];
    for (const r of decoded.results) {
      const player = byName.get(r.playerName.trim().toLowerCase());
      if (!player) {
        unmatchedNames.push(r.playerName);
        continue;
      }
      results.push({
        playerId: player.id,
        playerName: player.name,
        clan: r.clan,
        totalPoints: r.totalPoints,
        fightWin1f: r.fightWin1f,
        fightWin2f: r.fightWin2f,
        threeVillages: r.threeVillages,
        firstToshiRanbo: r.firstToshiRanbo,
        heldToshiRanbo: r.heldToshiRanbo,
        twoShrines: r.twoShrines,
        threeNobleActions: r.threeNobleActions,
        twoBuildings: r.twoBuildings,
        threeTactics: r.threeTactics,
        clanGoal1: r.clanGoal1,
        clanGoal2: r.clanGoal2,
      });
    }

    if (unmatchedNames.length > 0) {
      const known = roster.map((p) => p.name).join(', ');
      await ctx.reply(
        `I don't recognize these player name(s): ${unmatchedNames.join(', ')}\n` +
          `Known players: ${known}\n` +
          `Run /game again and reply with the corrected name(s) — I won't create new players automatically.`,
        { reply_parameters: { message_id: replyToMessageId } },
      );
      return;
    }

    // Download the photo now (while the file_id is fresh) rather than at
    // confirm time — Telegram file links expire, and we'd rather hold a
    // small buffer in memory for up to PENDING_TTL_MS than re-fetch later.
    const largestPhoto = photos[photos.length - 1];
    const file = await ctx.api.getFile(largestPhoto.file_id);
    const { mimetype, extension } = mimetypeAndExtension(file.file_path);
    const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
    const downloadRes = await fetch(fileUrl);
    if (!downloadRes.ok) {
      await ctx.reply(
        "Couldn't download the photo from Telegram — try posting it again.",
        {
          reply_parameters: { message_id: replyToMessageId },
        },
      );
      return;
    }
    const buffer = Buffer.from(await downloadRes.arrayBuffer());

    const pending = this.pendingStore.create({
      chatId,
      cardsPlayed: decoded.cardsPlayed,
      results,
      photo: { buffer, mimetype, extension },
    });

    const summaryLines = results.map((r) => {
      const flags = SCORE_FLAG_KEYS.filter((k) => r[k]).map(
        (k) => FLAG_LABELS[k],
      );
      const flagText = flags.length ? ` — ${flags.join(', ')}` : '';
      return `• ${r.playerName} (${r.clan}): ${r.totalPoints}${flagText}`;
    });
    const cardsLine =
      decoded.cardsPlayed != null
        ? `Cards played: ${decoded.cardsPlayed}\n`
        : '';
    const summary = `Here's what I'm about to record:\n\n${cardsLine}${summaryLines.join('\n')}\n\nLook right?`;

    const keyboard = new InlineKeyboard()
      .text('✅ Confirm', `confirm:${pending.id}`)
      .text('❌ Cancel', `cancel:${pending.id}`);

    await ctx.reply(summary, {
      reply_parameters: { message_id: replyToMessageId },
      reply_markup: keyboard,
    });
  }

  private async handleConfirmation(ctx: Context) {
    const data = ctx.callbackQuery?.data;
    if (!data) return;
    const [action, pendingId] = data.split(':');

    await ctx.answerCallbackQuery();

    const pending = this.pendingStore.get(pendingId);
    if (!pending) {
      await ctx.editMessageText(
        'This confirmation expired (or was already handled) — post the photo and scores again to retry.',
      );
      return;
    }

    // Discard immediately so a double-tap can't submit twice.
    this.pendingStore.discard(pendingId);

    if (action === 'cancel') {
      await ctx.editMessageText('Cancelled — nothing was recorded.');
      return;
    }

    if (action !== 'confirm') return;

    try {
      const game = await this.gamesService.createGame({
        cardsPlayed: pending.cardsPlayed ?? undefined,
        results: pending.results.map((r) => ({
          playerId: r.playerId,
          clan: r.clan,
          totalPoints: r.totalPoints,
          fightWin1f: r.fightWin1f,
          fightWin2f: r.fightWin2f,
          threeVillages: r.threeVillages,
          firstToshiRanbo: r.firstToshiRanbo,
          heldToshiRanbo: r.heldToshiRanbo,
          twoShrines: r.twoShrines,
          threeNobleActions: r.threeNobleActions,
          twoBuildings: r.twoBuildings,
          threeTactics: r.threeTactics,
          clanGoal1: r.clanGoal1,
          clanGoal2: r.clanGoal2,
        })),
      });

      const multerFile: Express.Multer.File = {
        fieldname: 'photo',
        originalname: `game-${game.id}.${pending.photo.extension}`,
        encoding: '7bit',
        mimetype: pending.photo.mimetype,
        size: pending.photo.buffer.length,
        stream: Readable.from(pending.photo.buffer),
        destination: '',
        filename: '',
        path: '',
        buffer: pending.photo.buffer,
      };
      await this.gamesService.setGamePhoto(game.id, multerFile);

      await ctx.editMessageText(`✅ Saved as Game #${game.id}.`);
    } catch (error) {
      this.logger.error(
        `Failed to save game from Telegram confirmation: ${error}`,
      );
      await ctx.editMessageText(
        `Confirmed, but saving failed: ${error instanceof Error ? error.message : error}\nPost the photo and scores again to retry.`,
      );
    }
  }
}
