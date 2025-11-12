import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service';
import { CreateGameDto, UpdateGameDto, AddScoreDto } from './dto/games.dto';

@Injectable()
export class GamesService {
  constructor(private prisma: PrismaService) {}

  // Create a new Imperial game
  async create(createGameDto: CreateGameDto) {
    return this.prisma.imperialGame.create({
      data: {
        createdById: createGameDto.createdById,
        status: 'in_progress',
      },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        scores: {
          include: {
            player: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });
  }

  // Get all games
  async findAll() {
    return this.prisma.imperialGame.findMany({
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        scores: {
          include: {
            player: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { finalScore: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Get a single game by ID
  async findOne(id: string) {
    const game = await this.prisma.imperialGame.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        scores: {
          include: {
            player: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { finalScore: 'desc' },
        },
      },
    });

    if (!game) {
      throw new NotFoundException(`Game with ID ${id} not found`);
    }

    return game;
  }

  // Update a game (e.g., mark as completed)
  async update(id: string, updateGameDto: UpdateGameDto) {
    await this.findOne(id); // Ensure game exists

    return this.prisma.imperialGame.update({
      where: { id },
      data: {
        ...updateGameDto,
        ...(updateGameDto.status === 'completed' && {
          completedAt: new Date(),
        }),
      },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        scores: {
          include: {
            player: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { finalScore: 'desc' },
        },
      },
    });
  }

  // Delete a game
  async remove(id: string) {
    await this.findOne(id); // Ensure game exists

    return this.prisma.imperialGame.delete({
      where: { id },
    });
  }

  // Add or update a player's score in a game
  async addScore(id: string, addScoreDto: AddScoreDto) {
    await this.findOne(id); // Ensure game exists

    // Upsert the score (create if not exists, update if exists)
    const score = await this.prisma.imperialScore.upsert({
      where: {
        gameId_playerId: {
          gameId: id,
          playerId: addScoreDto.playerId,
        },
      },
      create: {
        gameId: id,
        playerId: addScoreDto.playerId,
        nation: addScoreDto.nation,
        finalScore: addScoreDto.finalScore,
        position: addScoreDto.position,
      },
      update: {
        nation: addScoreDto.nation,
        finalScore: addScoreDto.finalScore,
        position: addScoreDto.position,
      },
      include: {
        player: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return score;
  }

  // Get leaderboard for a specific game
  async getLeaderboard(id: string) {
    await this.findOne(id); // Ensure game exists

    const scores = await this.prisma.imperialScore.findMany({
      where: { gameId: id },
      include: {
        player: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { finalScore: 'desc' },
    });

    return scores;
  }
}
