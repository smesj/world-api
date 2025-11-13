import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        imageUrl: true,
      },
      orderBy: [
        { username: 'asc' },
        { firstName: 'asc' },
      ],
    });

    return users;
  }
}
