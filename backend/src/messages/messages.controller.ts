import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
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
}
