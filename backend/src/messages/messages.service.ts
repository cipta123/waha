import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConversationEntity } from '../database/entities/conversation.entity';
import { MessageEntity } from '../database/entities/message.entity';
import { SendMessageDto } from './dto/send-message.dto';
import { WahaService } from '../waha/waha.service';
import { WebhookEventDto } from './dto/webhook-event.dto';

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    @InjectRepository(ConversationEntity)
    private readonly conversationRepository: Repository<ConversationEntity>,
    @InjectRepository(MessageEntity)
    private readonly messageRepository: Repository<MessageEntity>,
    private readonly wahaService: WahaService,
  ) {}

  async listConversations(limit = 25) {
    return this.conversationRepository.find({
      order: { updatedAt: 'DESC' },
      take: limit,
    });
  }

  async listMessages(conversationId: string) {
    return this.messageRepository.find({
      where: { conversation: { id: conversationId } },
      order: { createdAt: 'ASC' },
    });
  }

  async sendText(dto: SendMessageDto) {
    await this.wahaService.sendText(dto);

    let conversation = await this.conversationRepository.findOne({
      where: { waChatId: dto.chatId },
    });

    if (!conversation) {
      conversation = this.conversationRepository.create({
        waChatId: dto.chatId,
        title: dto.chatId,
      });
    }

    conversation.lastMessageAt = new Date();

    const savedConversation = await this.conversationRepository.save(conversation);

    const message = this.messageRepository.create({
      conversation: savedConversation,
      direction: 'outgoing',
      text: dto.text,
    });

    const savedMessage = await this.messageRepository.save(message);

    return {
      conversationId: savedConversation.id,
      messageId: savedMessage.id,
    };
  }

  async handleWebhook(event: WebhookEventDto) {
    this.logger.log(`Webhook event: ${event.event} from session ${event.session}`);

    // Only process message events
    if (event.event !== 'message') {
      return { processed: 0, event: event.event };
    }

    // Extract message from payload
    const message = event.payload;
    if (!message || !message.from) {
      this.logger.warn('Message event without valid payload');
      return { processed: 0 };
    }

    const payload = {
      chatId: message.from,
      text: message.body || '',
      ...(message.id ? { waMessageId: message.id } : {}),
      ...(message.pushName ? { senderName: message.pushName } : {}),
      ...(message ? { raw: message as Record<string, unknown> } : {}),
    };

    await this.saveIncomingMessage(payload);

    return { processed: 1 };
  }

  async saveIncomingMessage(payload: {
    chatId: string;
    text: string;
    senderName?: string;
    waMessageId?: string;
    raw?: Record<string, unknown>;
  }) {
    let conversation = await this.conversationRepository.findOne({
      where: { waChatId: payload.chatId },
    });

    if (!conversation) {
      conversation = this.conversationRepository.create({
        waChatId: payload.chatId,
        title: payload.senderName ?? payload.chatId,
      });
    }

    conversation.lastMessageAt = new Date();
    const savedConversation = await this.conversationRepository.save(conversation);

    const message = this.messageRepository.create({
      conversation: savedConversation,
      direction: 'incoming',
      text: payload.text,
      ...(payload.senderName ? { senderName: payload.senderName } : {}),
      ...(payload.waMessageId ? { waMessageId: payload.waMessageId } : {}),
      ...(payload.raw ? { payload: payload.raw } : {}),
    });

    return this.messageRepository.save(message);
  }
}
