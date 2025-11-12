import { Injectable, Logger } from '@nestjs/common';
import { Webhook } from 'svix';
import { PrismaService } from '../../shared/prisma.service';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);
  private readonly webhookSecret: string;

  constructor(private prisma: PrismaService) {
    this.webhookSecret = process.env.CLERK_WEBHOOK_SECRET || '';
    if (!this.webhookSecret) {
      this.logger.warn('CLERK_WEBHOOK_SECRET not set - webhook verification disabled');
    }
  }

  async handleClerkWebhook(
    payload: any,
    svixId: string,
    svixTimestamp: string,
    svixSignature: string,
  ) {
    // Verify webhook signature if secret is configured
    if (this.webhookSecret) {
      const wh = new Webhook(this.webhookSecret);
      try {
        wh.verify(JSON.stringify(payload), {
          'svix-id': svixId,
          'svix-timestamp': svixTimestamp,
          'svix-signature': svixSignature,
        });
      } catch (error) {
        this.logger.error('Webhook verification failed', error);
        throw new Error('Invalid webhook signature');
      }
    }

    const { type, data } = payload;

    switch (type) {
      case 'user.created':
        await this.handleUserCreated(data);
        break;
      case 'user.updated':
        await this.handleUserUpdated(data);
        break;
      case 'user.deleted':
        await this.handleUserDeleted(data);
        break;
      default:
        this.logger.log(`Unhandled webhook type: ${type}`);
    }
  }

  private async handleUserCreated(data: any) {
    this.logger.log(`Creating user: ${data.id}`);

    const username = data.username;

    await this.prisma.user.create({
      data: {
        id: data.id,
        username: username || '',
        firstName: data.first_name,
        lastName: data.last_name,
        imageUrl: data.image_url,
        lastSignInAt: data.last_sign_in_at ? new Date(data.last_sign_in_at) : null,
      },
    });

    this.logger.log(`User created: ${data.id}`);
  }

  private async handleUserUpdated(data: any) {
    this.logger.log(`Updating user: ${data.id}`);

    const username = data.username;

    await this.prisma.user.upsert({
      where: { id: data.id },
      update: {
        username: username || '',
        firstName: data.first_name,
        lastName: data.last_name,
        imageUrl: data.image_url,
        lastSignInAt: data.last_sign_in_at ? new Date(data.last_sign_in_at) : null,
      },
      create: {
        id: data.id,
        username: username || '',
        firstName: data.first_name,
        lastName: data.last_name,
        imageUrl: data.image_url,
        lastSignInAt: data.last_sign_in_at ? new Date(data.last_sign_in_at) : null,
      },
    });

    this.logger.log(`User updated: ${data.id}`);
  }

  private async handleUserDeleted(data: any) {
    this.logger.log(`Deleting user: ${data.id}`);

    await this.prisma.user.delete({
      where: { id: data.id },
    });

    this.logger.log(`User deleted: ${data.id}`);
  }
}
