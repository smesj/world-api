import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service';
import {
  JoinGameDto,
  AddParticipantDto,
  UpdateGameDto,
  FilterGamesDto,
} from './games.dto';

@Injectable()
export class GamesService {
  constructor(private prisma: PrismaService) {}

  async createGame(userId: string) {
    // Create game and footy game details in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create the base game
      const game = await tx.game.create({
        data: {
          type: 'FOOTY',
          status: 'PENDING',
        },
      });

      // Create the footy-specific game details
      await tx.footyGame.create({
        data: {
          gameId: game.id,
        },
      });

      // Add the creator as first participant (team_a)
      await tx.gameParticipation.create({
        data: {
          gameId: game.id,
          userId: userId,
          role: 'team_a',
        },
      });

      return game;
    });

    // Fetch and return the complete game with participations
    return this.getGame(result.id);
  }

  async getGames(filters?: FilterGamesDto) {
    const where: any = {
      type: 'FOOTY',
    };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.userId) {
      where.participations = {
        some: {
          userId: filters.userId,
        },
      };
    }

    const games = await this.prisma.game.findMany({
      where,
      include: {
        footyGame: true,
        participations: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                imageUrl: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return games;
  }

  async getGame(id: number) {
    const game = await this.prisma.game.findUnique({
      where: { id },
      include: {
        footyGame: true,
        participations: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                imageUrl: true,
              },
            },
          },
        },
      },
    });

    if (!game) {
      throw new NotFoundException(`Game with ID ${id} not found`);
    }

    if (game.type !== 'FOOTY') {
      throw new BadRequestException(`Game ${id} is not a Footy game`);
    }

    return game;
  }

  async joinGame(gameId: number, dto: JoinGameDto) {
    const game = await this.getGame(gameId);

    // Verify game is in PENDING status
    if (game.status !== 'PENDING') {
      throw new BadRequestException(
        'Can only join games in PENDING status',
      );
    }

    // Check if team_b slot is already taken
    const existingTeamB = game.participations.find((p) => p.role === 'team_b');
    if (existingTeamB) {
      throw new BadRequestException('Team B is already full');
    }

    // Check if user is already in the game
    const alreadyParticipating = game.participations.find(
      (p) => p.userId === dto.userId,
    );
    if (alreadyParticipating) {
      throw new BadRequestException('User is already in this game');
    }

    // Add user as team_b
    await this.prisma.gameParticipation.create({
      data: {
        gameId,
        userId: dto.userId,
        role: 'team_b',
      },
    });

    return this.getGame(gameId);
  }

  async addParticipant(gameId: number, dto: AddParticipantDto) {
    const game = await this.getGame(gameId);

    // Verify game is in PENDING status
    if (game.status !== 'PENDING') {
      throw new BadRequestException(
        'Can only add participants to games in PENDING status',
      );
    }

    // Check if role is already taken
    const existingRole = game.participations.find((p) => p.role === dto.role);
    if (existingRole) {
      throw new BadRequestException(`Role ${dto.role} is already taken`);
    }

    // Check if user is already in the game
    const alreadyParticipating = game.participations.find(
      (p) => p.userId === dto.userId,
    );
    if (alreadyParticipating) {
      throw new BadRequestException('User is already in this game');
    }

    // Add participant
    await this.prisma.gameParticipation.create({
      data: {
        gameId,
        userId: dto.userId,
        role: dto.role,
      },
    });

    return this.getGame(gameId);
  }

  async startGame(gameId: number) {
    const game = await this.getGame(gameId);

    // Verify game is in PENDING status
    if (game.status !== 'PENDING') {
      throw new BadRequestException('Game is not in PENDING status');
    }

    // Verify both teams have participants
    const hasTeamA = game.participations.some((p) => p.role === 'team_a');
    const hasTeamB = game.participations.some((p) => p.role === 'team_b');

    if (!hasTeamA || !hasTeamB) {
      throw new BadRequestException(
        'Both teams must have participants before starting',
      );
    }

    // Update game status to ACTIVE
    await this.prisma.game.update({
      where: { id: gameId },
      data: { status: 'ACTIVE' },
    });

    return this.getGame(gameId);
  }

  async updateGame(gameId: number, dto: UpdateGameDto) {
    const game = await this.getGame(gameId);

    // Verify game is in ACTIVE status for score updates
    if (game.status !== 'ACTIVE') {
      throw new BadRequestException(
        'Can only update games in ACTIVE status',
      );
    }

    // Update the footy game details
    await this.prisma.footyGame.update({
      where: { gameId },
      data: {
        scoreTeamA: dto.scoreTeamA,
        scoreTeamB: dto.scoreTeamB,
        duration: dto.duration,
      },
    });

    return this.getGame(gameId);
  }

  async completeGame(gameId: number) {
    const game = await this.getGame(gameId);

    // Verify game is in ACTIVE status
    if (game.status !== 'ACTIVE') {
      throw new BadRequestException('Game is not in ACTIVE status');
    }

    // Update game status to COMPLETED
    await this.prisma.game.update({
      where: { id: gameId },
      data: { status: 'COMPLETED' },
    });

    return this.getGame(gameId);
  }

  async abandonGame(gameId: number) {
    const game = await this.getGame(gameId);

    // Can abandon from any status except COMPLETED
    if (game.status === 'COMPLETED') {
      throw new BadRequestException('Cannot abandon a completed game');
    }

    // Update game status to ABANDONED
    await this.prisma.game.update({
      where: { id: gameId },
      data: { status: 'ABANDONED' },
    });

    return this.getGame(gameId);
  }

  async removeParticipant(gameId: number, participationId: number) {
    const game = await this.getGame(gameId);

    // Verify game is in PENDING status
    if (game.status !== 'PENDING') {
      throw new BadRequestException(
        'Can only remove participants from games in PENDING status',
      );
    }

    // Verify participation exists and belongs to this game
    const participation = game.participations.find((p) => p.id === participationId);
    if (!participation) {
      throw new NotFoundException(
        `Participation ${participationId} not found in game ${gameId}`,
      );
    }

    // Remove the participation
    await this.prisma.gameParticipation.delete({
      where: { id: participationId },
    });

    return this.getGame(gameId);
  }
}
