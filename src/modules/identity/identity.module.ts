import { Module } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service';
import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';

@Module({
  controllers: [InvitationsController],
  providers: [PrismaService, InvitationsService],
  exports: [InvitationsService],
})
export class IdentityModule {}
