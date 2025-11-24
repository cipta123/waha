import { Body, Controller, Get, Param, Post, Query, Res, Delete } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('conversations')
  listConversations(
    @Query('limit') limit?: number,
    @Query('type') type?: 'all' | 'my' | 'queue',
    @Query('userId') userId?: string,
  ) {
    return this.messagesService.listConversations(limit, type, userId);
  }

  @Get(':conversationId')
  listMessages(
    @Param('conversationId') conversationId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.messagesService.listMessages(conversationId, limit, offset);
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

  @Post(':conversationId/assign')
  assignConversation(
    @Param('conversationId') conversationId: string,
    @Body() body: { userId: string }
  ) {
    return this.messagesService.assignConversation(conversationId, body.userId);
  }

  @Post(':conversationId/unassign')
  unassignConversation(@Param('conversationId') conversationId: string) {
    return this.messagesService.unassignConversation(conversationId);
  }

  @Post(':conversationId/resolve')
  resolveConversation(
    @Param('conversationId') conversationId: string,
    @Body() body: { notes?: string }
  ) {
    return this.messagesService.resolveConversation(conversationId, body.notes);
  }

  @Post(':conversationId/transfer')
  transferConversation(
    @Param('conversationId') conversationId: string,
    @Body() body: { fromUserId: string; toUserId: string }
  ) {
    return this.messagesService.transferConversation(conversationId, body.fromUserId, body.toUserId);
  }

  @Delete(':conversationId')
  deleteConversation(@Param('conversationId') conversationId: string) {
    return this.messagesService.deleteConversation(conversationId);
  }

  @Delete('msg/:messageId')
  deleteMessage(@Param('messageId') messageId: string) {
    return this.messagesService.deleteMessage(messageId);
  }
}
