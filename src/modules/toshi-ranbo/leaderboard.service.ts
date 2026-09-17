import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service';
import {
  SEASON_1_LEAGUE_AVG,
  SEASON_SHRINK_K,
  RECENT_FORM_K,
  RECENT_FORM_WINDOW,
  RECENT_FORM_WEIGHT,
} from './leaderboard.constants';

export interface RanboRatingEntry {
  playerId: number;
  name: string;
  gamesPlayed: number;
  wins: number;
  seasonAvg: number;
  recentForm: number;
  rating: number;
}

const WIN_CONDITION_POINTS = 7;

interface PlayerAccumulator {
  name: string;
  adjustedScores: number[]; // chronological order, oldest first
  wins: number;
}

@Injectable()
export class LeaderboardService {
  constructor(private prisma: PrismaService) {}

  // Ranbo Rating: per-game score (points + a win bonus scaled to table
  // size) rolled into a season average, blended with a recent-form
  // window so a hot streak can still move the board. See
  // leaderboard.constants.ts for the formula's tunable constants.
  async getLeaderboard(): Promise<RanboRatingEntry[]> {
    const games = await this.prisma.game.findMany({
      where: { type: 'TOSHI_RANBO' },
      include: {
        toshiRanboScores: { include: { player: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const byPlayer = new Map<number, PlayerAccumulator>();

    for (const game of games) {
      const scores = game.toshiRanboScores;
      if (scores.length === 0) continue;

      const winBonus = scores.length - 2;
      const winnerId = scores.find(
        (s) => s.totalPoints === WIN_CONDITION_POINTS,
      )?.playerId;

      for (const score of scores) {
        const entry = byPlayer.get(score.playerId) ?? {
          name: score.player.name,
          adjustedScores: [],
          wins: 0,
        };
        const isWinner = score.playerId === winnerId;
        entry.adjustedScores.push(
          score.totalPoints + (isWinner ? winBonus : 0),
        );
        if (isWinner) entry.wins += 1;
        byPlayer.set(score.playerId, entry);
      }
    }

    const leagueAvg = SEASON_1_LEAGUE_AVG;

    const standings: RanboRatingEntry[] = [...byPlayer.entries()].map(
      ([playerId, p]) => {
        const gamesPlayed = p.adjustedScores.length;
        const sum = p.adjustedScores.reduce((a, b) => a + b, 0);
        const seasonAvg =
          (sum + SEASON_SHRINK_K * leagueAvg) / (gamesPlayed + SEASON_SHRINK_K);

        const recentWindow = p.adjustedScores.slice(-RECENT_FORM_WINDOW);
        const recentSum = recentWindow.reduce((a, b) => a + b, 0);
        const recentForm =
          (recentSum + RECENT_FORM_K * seasonAvg) /
          (recentWindow.length + RECENT_FORM_K);

        const rating =
          (1 - RECENT_FORM_WEIGHT) * seasonAvg +
          RECENT_FORM_WEIGHT * recentForm;

        return {
          playerId,
          name: p.name,
          gamesPlayed,
          wins: p.wins,
          seasonAvg,
          recentForm,
          rating,
        };
      },
    );

    return standings.sort((a, b) => b.rating - a.rating);
  }
}
