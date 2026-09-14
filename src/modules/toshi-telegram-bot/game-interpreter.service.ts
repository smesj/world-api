import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { SHORTHAND_DECODE_TABLE } from './shorthand-table';

const PlayerResultSchema = z.object({
  playerName: z
    .string()
    .describe(
      "Player's name exactly as typed in the caption — don't correct spelling or casing, roster matching happens separately",
    ),
  clan: z.string().describe('Clan name as typed in the caption'),
  totalPoints: z.number().int().min(0),
  fightWin1f: z.boolean(),
  fightWin2f: z.boolean(),
  threeVillages: z.boolean(),
  firstToshiRanbo: z.boolean(),
  heldToshiRanbo: z.boolean(),
  twoShrines: z.boolean(),
  threeNobleActions: z.boolean(),
  twoBuildings: z.boolean(),
  threeTactics: z.boolean(),
  clanGoal1: z.boolean(),
  clanGoal2: z.boolean(),
});

const DecodedGameSchema = z.object({
  cardsPlayed: z
    .number()
    .int()
    .min(0)
    .nullable()
    .describe(
      'Cards played this game, if a line like "Game 3 (4 card)" states it. Null if not mentioned.',
    ),
  results: z.array(PlayerResultSchema).min(2),
  unresolvedCodes: z
    .array(z.string())
    .describe(
      'Any shorthand code found in the caption that does not match a known category and is not an obvious typo/reordering of one. Do NOT guess which category these mean — list the raw code here instead so a human can clarify.',
    ),
});

export type DecodedGame = z.infer<typeof DecodedGameSchema>;

const SYSTEM_PROMPT = `You decode shorthand Toshi Ranbo (board game) score postings into structured data.

Input looks like one game, one line per player:
Player - Clan - TotalPoints (shorthand codes)
optionally preceded by a line naming cards played, e.g. "Game 3 (4 card)".

Shorthand codes are written casually by hand and get reordered or typo'd —
treat digit+letter and letter+digit as the same code (e.g. "1f" and "f1" are
the same category).

${SHORTHAND_DECODE_TABLE}

Rules:
- totalPoints is trusted input — copy it as written, never derive it from the flags.
- If a code doesn't match anything in the table and isn't an obvious typo/reorder
  of one, do NOT guess which category it means — put the raw code string in
  unresolvedCodes instead. It may be a genuine new category that needs a human
  decision, not a mistake.
- Preserve player names and clan names exactly as typed.`;

// Decodes a Telegram game-night caption (the same shorthand format used for
// manual recording, see "Recording Game Results" in .claude-context.md) into
// structured data via a single Claude call. Player-name → playerId resolution
// happens afterward against the live roster, not here — this service only
// decodes shorthand, it never talks to the database.
@Injectable()
export class GameInterpreterService {
  private readonly logger = new Logger(GameInterpreterService.name);
  private readonly client: Anthropic | null;
  private readonly model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

  constructor() {
    if (!process.env.ANTHROPIC_API_KEY) {
      this.logger.warn(
        'ANTHROPIC_API_KEY is not set — Telegram game interpretation is unavailable',
      );
      this.client = null;
      return;
    }
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  get isConfigured(): boolean {
    return this.client !== null;
  }

  async decode(captionText: string): Promise<DecodedGame> {
    if (!this.client) {
      throw new Error(
        'Claude API is not configured on this server (missing ANTHROPIC_API_KEY)',
      );
    }

    const response = await this.client.messages.parse({
      model: this.model,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: captionText }],
      output_config: { format: zodOutputFormat(DecodedGameSchema) },
    });

    if (!response.parsed_output) {
      throw new Error(
        "Claude didn't return a parseable result for this caption",
      );
    }

    this.logger.log(
      `Decoded caption into ${response.parsed_output.results.length} player result(s)` +
        (response.parsed_output.unresolvedCodes.length
          ? `, ${response.parsed_output.unresolvedCodes.length} unresolved code(s)`
          : ''),
    );

    return response.parsed_output;
  }
}
