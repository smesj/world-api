import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service';
import { CreateToshiRanboGameDto } from './dto/games.dto';

const PLAYER_SELECT = {
  id: true,
  name: true,
};

@Injectable()
export class GamesService {
  constructor(private prisma: PrismaService) {}

  // Record a completed Toshi Ranbo game and every player's result in one call
  async createGame(dto: CreateToshiRanboGameDto) {
    const playerIds = dto.results.map((r) => r.playerId);
    const uniquePlayerIds = new Set(playerIds);
    if (uniquePlayerIds.size !== playerIds.length) {
      throw new BadRequestException(
        'Duplicate playerId in results — each player can only appear once per game',
      );
    }

    const players = await this.prisma.toshiRanboPlayer.findMany({
      where: { id: { in: playerIds } },
      select: { id: true },
    });
    const foundIds = new Set(players.map((p) => p.id));
    const missingIds = playerIds.filter((id) => !foundIds.has(id));
    if (missingIds.length > 0) {
      throw new NotFoundException(
        `Unknown playerId(s): ${missingIds.join(', ')} — create them via POST /toshi-ranbo/players or look them up via GET /toshi-ranbo/players`,
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const game = await tx.game.create({
        data: {
          type: 'TOSHI_RANBO',
          status: 'COMPLETED',
        },
      });

      await tx.toshiRanboGame.create({
        data: {
          gameId: game.id,
          cardsPlayed: dto.cardsPlayed,
        },
      });

      await tx.toshiRanboScore.createMany({
        data: dto.results.map((r) => ({
          gameId: game.id,
          playerId: r.playerId,
          clan: r.clan,
          totalPoints: r.totalPoints,
          fightWin1f: r.fightWin1f ?? false,
          fightWin2f: r.fightWin2f ?? false,
          threeVillages: r.threeVillages ?? false,
          firstToshiRanbo: r.firstToshiRanbo ?? false,
          twoShrines: r.twoShrines ?? false,
          threeNobleActions: r.threeNobleActions ?? false,
          twoBuildings: r.twoBuildings ?? false,
          threeTactics: r.threeTactics ?? false,
          clanGoal1: r.clanGoal1 ?? false,
          clanGoal2: r.clanGoal2 ?? false,
        })),
      });

      return game;
    });

    return this.getGame(result.id);
  }

  async getGame(id: number) {
    const game = await this.prisma.game.findUnique({
      where: { id },
      include: {
        toshiRanboGame: true,
        toshiRanboScores: {
          include: { player: { select: PLAYER_SELECT } },
          orderBy: { totalPoints: 'desc' },
        },
      },
    });

    if (!game || game.type !== 'TOSHI_RANBO') {
      throw new NotFoundException(`Toshi Ranbo game with ID ${id} not found`);
    }

    return game;
  }
}
