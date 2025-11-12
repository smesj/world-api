import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service';
import * as QRCode from 'qrcode';

@Injectable()
export class InvitationsService {
  constructor(private prisma: PrismaService) {}

  // Generate a new invitation code
  async create(createdById?: string, expiresInDays?: number) {
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    return this.prisma.invitation.create({
      data: {
        createdById,
        expiresAt,
      },
    });
  }

  // Validate an invitation code
  async validate(code: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { code },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation code not found');
    }

    // Check if expired
    if (invitation.expiresAt && invitation.expiresAt < new Date()) {
      throw new BadRequestException('Invitation code has expired');
    }

    // Check if max uses reached
    if (invitation.usesCount >= invitation.maxUses) {
      throw new BadRequestException('Invitation code has reached maximum uses');
    }

    return {
      valid: true,
      invitation: {
        id: invitation.id,
        code: invitation.code,
        usesRemaining: invitation.maxUses - invitation.usesCount,
      },
    };
  }

  // Use an invitation code (increment usage counter)
  async use(code: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { code },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation code not found');
    }

    // Validate before use
    await this.validate(code);

    // Increment uses count
    await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        usesCount: { increment: 1 },
      },
    });

    return { success: true, message: 'Invitation code used successfully' };
  }

  // Get all invitations (admin only)
  async findAll() {
    return this.prisma.invitation.findMany({
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Get invitation by code
  async findByCode(code: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { code },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    return invitation;
  }

  // Delete an invitation
  async delete(id: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { id },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    await this.prisma.invitation.delete({
      where: { id },
    });

    return { success: true, message: 'Invitation deleted successfully' };
  }

  // Generate QR code for invitation
  async generateQRCode(code: string): Promise<Buffer> {
    // Verify invitation exists
    await this.findByCode(code);

    // Generate login URL with invite code
    const adminFrontendUrl = process.env.ADMIN_FRONTEND_URL || 'http://localhost:3001';
    const loginUrl = `${adminFrontendUrl}/login/${code}`;

    // Generate QR code as buffer (PNG image)
    const qrBuffer = await QRCode.toBuffer(loginUrl, {
      type: 'png',
      width: 300,
      margin: 2,
      errorCorrectionLevel: 'M',
    });

    return qrBuffer;
  }
}
