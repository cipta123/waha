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
    const conversations = await this.conversationRepository.find({
      order: { updatedAt: 'DESC' },
      take: limit,
    });

    // Fetch last message for each conversation
    const conversationsWithLastMessage = await Promise.all(
      conversations.map(async (conversation) => {
        const lastMessage = await this.messageRepository.findOne({
          where: { conversation: { id: conversation.id } },
          order: { createdAt: 'DESC' },
        });

        return {
          ...conversation,
          lastMessage: lastMessage
            ? {
                id: lastMessage.id,
                text: lastMessage.text,
                direction: lastMessage.direction,
                createdAt: lastMessage.createdAt,
              }
            : null,
        };
      }),
    );

    return conversationsWithLastMessage;
  }

  async listMessages(conversationId: string) {
    return this.messageRepository.find({
      where: { conversation: { id: conversationId } },
      order: { createdAt: 'ASC' },
    });
  }

  async sendText(dto: SendMessageDto) {
    const wahaResponse: any = await this.wahaService.sendText(dto);

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
      waMessageId: wahaResponse?.id, // Save WA message ID for tracking ack
      ackStatus: 'pending', // Initial status
    });

    const savedMessage = await this.messageRepository.save(message);

    return {
      conversationId: savedConversation.id,
      messageId: savedMessage.id,
      waMessageId: wahaResponse?.id,
    };
  }

  async handleWebhook(event: WebhookEventDto) {
    this.logger.log(`Webhook event: ${event.event} from session ${event.session}`);

    // Handle message.ack event (read receipts)
    if (event.event === 'message.ack') {
      return this.handleMessageAck(event.payload);
    }

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

  async handleMessageAck(payload: any) {
    // payload contains: id (waMessageId), ack (status number)
    // ack: 0=pending, 1=sent, 2=delivered, 3=read, 4=played
    const waMessageId = payload.id;
    const ackNumber = payload.ack;

    if (!waMessageId) {
      this.logger.warn('Message ack without message ID');
      return { processed: 0 };
    }

    // Map ack number to status
    const ackStatusMap: Record<number, string> = {
      0: 'pending',
      1: 'sent',
      2: 'delivered',
      3: 'read',
      4: 'read', // played (for voice messages)
    };

    const ackStatus = ackStatusMap[ackNumber] || 'pending';

    // Try exact match first
    let message = await this.messageRepository.findOne({
      where: { waMessageId },
    });

    // If not found, try partial match (WAHA sometimes sends different ID formats)
    if (!message) {
      const messages = await this.messageRepository
        .createQueryBuilder('message')
        .where('message.waMessageId LIKE :id', { id: `%${waMessageId.split('_').pop()}%` })
        .andWhere('message.direction = :direction', { direction: 'outgoing' })
        .orderBy('message.createdAt', 'DESC')
        .limit(1)
        .getOne();
      
      message = messages;
    }

    if (message) {
      message.ackStatus = ackStatus as any;
      await this.messageRepository.save(message);
      this.logger.log(`Updated message ${waMessageId} ack status to ${ackStatus}`);
      return { processed: 1, messageId: message.id, ackStatus };
    }

    this.logger.warn(`Message ${waMessageId} not found for ack update`);
    return { processed: 0 };
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
        unreadCount: 0,
      });
    }

    conversation.lastMessageAt = new Date();
    conversation.unreadCount = (conversation.unreadCount || 0) + 1; // Increment unread count

    const savedConversation = await this.conversationRepository.save(conversation);

    // Extract media info from raw payload
    const rawMessage = payload.raw as any;
    let mediaUrl: string | undefined;
    let mediaType: string | undefined;
    let mimeType: string | undefined;
    let fileName: string | undefined;

    if (rawMessage?.hasMedia) {
      // WAHA provides media URL in the message
      mediaUrl = rawMessage.media?.url || rawMessage.mediaUrl;
      mimeType = rawMessage.media?.mimetype || rawMessage.mimetype;
      fileName = rawMessage.media?.filename || rawMessage.filename;

      // Determine media type from mimetype
      if (mimeType?.startsWith('image/')) {
        mediaType = 'image';
      } else if (mimeType?.startsWith('video/')) {
        mediaType = 'video';
      } else if (mimeType?.startsWith('audio/')) {
        mediaType = 'audio';
      } else {
        mediaType = 'document';
      }
    }

    const message = this.messageRepository.create({
      conversation: savedConversation,
      direction: 'incoming',
      text: payload.text || (mediaUrl ? '[Media]' : ''),
      ...(payload.senderName ? { senderName: payload.senderName } : {}),
      ...(payload.waMessageId ? { waMessageId: payload.waMessageId } : {}),
      ...(mediaUrl ? { mediaUrl } : {}),
      ...(mediaType ? { mediaType } : {}),
      ...(mimeType ? { mimeType } : {}),
      ...(fileName ? { fileName } : {}),
      ...(payload.raw ? { payload: payload.raw } : {}),
    });

    return this.messageRepository.save(message);
  }

  async markAsRead(conversationId: string) {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    conversation.unreadCount = 0;
    await this.conversationRepository.save(conversation);

    this.logger.log(`Marked conversation ${conversationId} as read`);
    return { success: true, conversationId };
  }

  async sendImage(dto: { chatId: string; file: { mimetype: string; data: string }; caption?: string; session?: string }) {
    const wahaResponse: any = await this.wahaService.sendImage(dto);

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
      text: dto.caption || '[Image]',
      waMessageId: wahaResponse?.id,
      ackStatus: 'pending',
      mediaType: 'image',
      mimeType: dto.file.mimetype,
      mediaUrl: `data:${dto.file.mimetype};base64,${dto.file.data}`, // Store as data URL for now
    });

    const savedMessage = await this.messageRepository.save(message);

    return {
      conversationId: savedConversation.id,
      messageId: savedMessage.id,
      waMessageId: wahaResponse?.id,
    };
  }
}
