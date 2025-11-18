import { Body, Controller, Headers, HttpCode, HttpStatus, Post, UnauthorizedException } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { WebhookEventDto } from './dto/webhook-event.dto';

@Controller('webhook')
export class WebhookController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post('waha')
  @HttpCode(HttpStatus.ACCEPTED)
  async handle(
    @Body() body: any,
    @Headers('x-header-1') secret?: string,
  ) {
    console.log('Webhook received:', JSON.stringify(body, null, 2));
    
    const expected = process.env.WEBHOOK_SECRET;
    if (expected && expected !== secret) {
      throw new UnauthorizedException('Invalid webhook secret');
    }

    return this.messagesService.handleWebhook(body);
  }
}
