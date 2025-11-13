import { Module } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service';
import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [InvitationsController, UsersController],
  providers: [PrismaService, InvitationsService, UsersService],
  exports: [InvitationsService, UsersService],
})
export class IdentityModule {}
