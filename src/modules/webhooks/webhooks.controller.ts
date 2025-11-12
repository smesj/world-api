import { Controller, Post, Body, Headers, BadRequestException, Logger } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('clerk')
  async handleClerkWebhook(
    @Headers('svix-id') svixId: string,
    @Headers('svix-timestamp') svixTimestamp: string,
    @Headers('svix-signature') svixSignature: string,
    @Body() payload: any,
  ) {
    if (!svixId || !svixTimestamp || !svixSignature) {
      throw new BadRequestException('Missing Svix headers');
    }

    this.logger.log(`Received Clerk webhook: ${payload.type}`);

    try {
      await this.webhooksService.handleClerkWebhook(
        payload,
        svixId,
        svixTimestamp,
        svixSignature,
      );

      return { success: true };
    } catch (error) {
      this.logger.error(`Webhook processing failed: ${error.message}`);
      throw new BadRequestException('Webhook verification failed');
    }
  }
}
