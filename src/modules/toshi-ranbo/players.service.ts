import { Injectable, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/prisma.service';
import { CreateToshiRanboPlayerDto } from './dto/players.dto';

@Injectable()
export class PlayersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateToshiRanboPlayerDto) {
    try {
      return await this.prisma.toshiRanboPlayer.create({
        data: { name: dto.name },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `Player named "${dto.name}" already exists`,
        );
      }
      throw error;
    }
  }

  async findAll() {
    return this.prisma.toshiRanboPlayer.findMany({
      orderBy: { name: 'asc' },
    });
  }
}
