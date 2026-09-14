import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';

const PENDING_TTL_MS = 15 * 60 * 1000; // 15 minutes

export interface PendingResult {
  playerId: number;
  playerName: string;
  clan: string;
  totalPoints: number;
  fightWin1f: boolean;
  fightWin2f: boolean;
  threeVillages: boolean;
  firstToshiRanbo: boolean;
  heldToshiRanbo: boolean;
  twoShrines: boolean;
  threeNobleActions: boolean;
  twoBuildings: boolean;
  threeTactics: boolean;
  clanGoal1: boolean;
  clanGoal2: boolean;
}

export interface PendingGame {
  id: string;
  chatId: number;
  cardsPlayed: number | null;
  results: PendingResult[];
  photo: { buffer: Buffer; mimetype: string; extension: string };
}

// In-memory holding area for decoded games awaiting a Confirm/Cancel tap in
// Telegram. Deliberately not persisted to the database — if world-api
// restarts mid-confirmation the pending entry is just lost, and the poster
// re-tags the bot to retry. Entries expire on their own after PENDING_TTL_MS
// so an ignored confirmation prompt doesn't hold a photo buffer in memory
// forever.
@Injectable()
export class PendingConfirmationStore {
  private readonly logger = new Logger(PendingConfirmationStore.name);
  private readonly pending = new Map<string, PendingGame>();
  private readonly timers = new Map<string, NodeJS.Timeout>();

  create(data: Omit<PendingGame, 'id'>): PendingGame {
    const id = randomUUID();
    const entry: PendingGame = { id, ...data };
    this.pending.set(id, entry);
    this.timers.set(
      id,
      setTimeout(() => {
        if (this.pending.delete(id)) {
          this.logger.warn(
            `Pending game ${id} expired unconfirmed after ${PENDING_TTL_MS / 60000}m`,
          );
        }
        this.timers.delete(id);
      }, PENDING_TTL_MS),
    );
    return entry;
  }

  get(id: string): PendingGame | undefined {
    return this.pending.get(id);
  }

  // Removes a pending entry (on confirm, cancel, or explicit discard) and
  // cancels its expiry timer. Always call this before acting on a
  // confirmation, so a double-tap on the Confirm button can't submit twice.
  discard(id: string): void {
    this.pending.delete(id);
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
  }
}
