import { Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('conversations')
  listConversations(@Query('limit') limit?: number) {
    return this.messagesService.listConversations(limit);
  }

  @Get(':conversationId')
  listMessages(@Param('conversationId') conversationId: string) {
    return this.messagesService.listMessages(conversationId);
  }

  @Post('send-text')
  sendText(@Body() dto: SendMessageDto) {
    return this.messagesService.sendText(dto);
  }

  @Post(':conversationId/mark-read')
  markAsRead(@Param('conversationId') conversationId: string) {
    return this.messagesService.markAsRead(conversationId);
  }

  @Post('send-image')
  sendImage(@Body() dto: { chatId: string; file: { mimetype: string; data: string }; caption?: string; session?: string }) {
    return this.messagesService.sendImage(dto);
  }

  @Get('media/:messageId')
  async getMedia(@Param('messageId') messageId: string, @Res() res: any) {
    return this.messagesService.proxyMedia(messageId, res);
  }

  @Post(':conversationId/toggle-ai-mode')
  toggleAiMode(
    @Param('conversationId') conversationId: string,
    @Body() body: { mode: 'ai' | 'human'; reason?: string }
  ) {
    return this.messagesService.toggleAiMode(conversationId, body.mode, body.reason);
  }
}
