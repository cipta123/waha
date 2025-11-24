import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, In, Not, Like, LessThan } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { randomBytes } from 'crypto';
import { ConversationEntity } from '../database/entities/conversation.entity';
import { MessageEntity } from '../database/entities/message.entity';
import { UserEntity } from '../database/entities/user.entity';
import { SendMessageDto } from './dto/send-message.dto';
import { WahaService } from '../waha/waha.service';
import { WebhookEventDto } from './dto/webhook-event.dto';
import { RagService } from '../rag/rag.service';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    @InjectRepository(ConversationEntity)
    private readonly conversationRepository: Repository<ConversationEntity>,
    @InjectRepository(MessageEntity)
    private readonly messageRepository: Repository<MessageEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly wahaService: WahaService,
    private readonly ragService: RagService,
    private readonly settingsService: SettingsService,
  ) {}

  async listConversations(limit = 25, type: 'all' | 'my' | 'queue' = 'all', userId?: string) {
    let conversations: ConversationEntity[];

    if (type === 'my' && userId) {
      // Conversations assigned to this user
      conversations = await this.conversationRepository.find({
        where: {
          owner: { id: userId },
          status: In(['open', 'pending']),
          waChatId: Not(Like('%@broadcast')),
        },
        order: { updatedAt: 'DESC' },
        take: limit,
        relations: ['owner'],
      });
    } else if (type === 'queue') {
      // Queue: ONLY human handoffs waiting for agent assignment
      // - mode = 'human' (human handoff requested)
      // - owner = null (not assigned to any agent)
      // - status = 'pending' (waiting for agent)
      // AI mode conversations are NOT in queue (handled automatically)
      conversations = await this.conversationRepository
        .createQueryBuilder('conversation')
        .leftJoinAndSelect('conversation.owner', 'owner')
        .where('conversation.mode = :mode', { mode: 'human' })
        .andWhere('conversation.owner IS NULL')
        .andWhere('conversation.status = :status', { status: 'pending' })
        .andWhere('conversation.waChatId NOT LIKE :broadcast', { broadcast: '%@broadcast' })
        .orderBy('conversation.updatedAt', 'DESC')
        .take(limit)
        .getMany();
    } else {
      // All conversations
      conversations = await this.conversationRepository.find({
        where: {
          status: In(['open', 'pending', 'resolved']),
          waChatId: Not(Like('%@broadcast')),
        },
        order: { updatedAt: 'DESC' },
        take: limit,
        relations: ['owner'],
      });
    }

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

  async listMessages(conversationId: string, limit = 50, offset = 0) {
    // Get total count
    const total = await this.messageRepository.count({
      where: { conversation: { id: conversationId } },
    });

    // Get messages in DESC order (newest first), then reverse to show oldest first
    const messages = await this.messageRepository.find({
      where: { conversation: { id: conversationId } },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    // Reverse to show in chronological order (oldest to newest)
    return {
      messages: messages.reverse(),
      total,
      hasMore: offset + limit < total,
    };
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

    // If replying to a message, fetch the quoted message details
    let quotedMsg: any = undefined;
    if (dto.reply_to) {
      const replyToMessage = await this.messageRepository.findOne({
        where: { waMessageId: dto.reply_to },
      });
      if (replyToMessage) {
        quotedMsg = {
          id: replyToMessage.id,
          text: replyToMessage.text,
          senderName: replyToMessage.senderName,
        };
      }
    }

    const message = this.messageRepository.create({
      conversation: savedConversation,
      direction: 'outgoing',
      text: dto.text,
      waMessageId: wahaResponse?.id, // Save WA message ID for tracking ack
      ackStatus: 'pending', // Initial status
      repliedBy: 'human', // Messages from dashboard are replied by human
      ...(quotedMsg ? { quotedMsg } : {}),
    });

    const savedMessage = await this.messageRepository.save(message);

    // When human replies, switch conversation to human mode
    if (savedConversation.mode === 'ai') {
      savedConversation.mode = 'human';
      await this.conversationRepository.save(savedConversation);
      this.logger.log(`Conversation ${savedConversation.id} switched to human mode after manual reply`);
    }

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

    // Only process 'message' event (skip 'message.any' to avoid duplicates)
    if (event.event !== 'message') {
      return { processed: 0, event: event.event };
    }

    // Extract message from payload
    const message = event.payload;
    
    // Check if message is outgoing (fromMe = true) or incoming
    const isOutgoing = message.fromMe === true;
    
    // For outgoing messages, chatId is in 'to' field, for incoming it's in 'from'
    const chatId = isOutgoing ? message.to : message.from;
    
    if (!message || !chatId) {
      this.logger.warn('Message event without valid payload or chatId');
      this.logger.warn(`fromMe: ${message?.fromMe}, from: ${message?.from}, to: ${message?.to}`);
      return { processed: 0 };
    }

    this.logger.log(`Processing ${isOutgoing ? 'OUTGOING' : 'INCOMING'} message to/from: ${chatId}`);

    if (isOutgoing) {
      // Handle outgoing message sent from WhatsApp app
      const payload = {
        chatId: chatId,
        text: message.body || '',
        ...(message.id ? { waMessageId: message.id } : {}),
        ...(message ? { raw: message as Record<string, unknown> } : {}),
      };
      await this.saveOutgoingMessage(payload);
      this.logger.log(`Saved outgoing message to ${chatId}`);
    } else {
      // Handle incoming message
      const payload = {
        chatId: chatId,
        text: message.body || '',
        ...(message.id ? { waMessageId: message.id } : {}),
        ...(message.pushName ? { senderName: message.pushName } : {}),
        ...(message ? { raw: message as Record<string, unknown> } : {}),
      };
      await this.saveIncomingMessage(payload);
      this.logger.log(`Saved incoming message from ${chatId}`);
    }

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

  async saveOutgoingMessage(payload: {
    chatId: string;
    text: string;
    waMessageId?: string;
    raw?: Record<string, unknown>;
  }) {
    let conversation = await this.conversationRepository.findOne({
      where: { waChatId: payload.chatId },
    });

    if (!conversation) {
      conversation = this.conversationRepository.create({
        waChatId: payload.chatId,
        title: payload.chatId,
        unreadCount: 0,
      });
    }

    conversation.lastMessageAt = new Date();
    const savedConversation = await this.conversationRepository.save(conversation);

    // Extract media info from raw payload
    const rawMessage = payload.raw as any;
    let mediaUrl: string | undefined;
    let mediaType: string | undefined;
    let mimeType: string | undefined;
    let fileName: string | undefined;

    if (rawMessage?.hasMedia) {
      if (rawMessage.media?.url) {
        mediaUrl = rawMessage.media.url;
        mimeType = rawMessage.media.mimetype || rawMessage.mimetype;
        fileName = rawMessage.media.filename || rawMessage.filename;
      } else {
        mimeType = rawMessage.mimetype;
        fileName = rawMessage.filename;
      }

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
      direction: 'outgoing',
      text: payload.text || (mediaType ? `[${mediaType === 'image' ? 'Image' : mediaType === 'video' ? 'Video' : mediaType === 'audio' ? 'Audio' : 'Document'}]` : ''),
      ...(payload.waMessageId ? { waMessageId: payload.waMessageId } : {}),
      ...(mediaUrl ? { mediaUrl } : {}),
      ...(mediaType ? { mediaType } : {}),
      ...(mimeType ? { mimeType } : {}),
      ...(fileName ? { fileName } : {}),
      ...(payload.raw ? { payload: payload.raw } : {}),
      ackStatus: 'sent', // Outgoing messages from WA app are already sent
    });

    return this.messageRepository.save(message);
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
        mode: 'ai', // Default to AI mode for new conversations
      });
    }

    // Ensure mode is set for existing conversations (migration fix)
    if (!conversation.mode) {
      conversation.mode = 'ai';
    }

    conversation.lastMessageAt = new Date();
    conversation.unreadCount = (conversation.unreadCount || 0) + 1; // Increment unread count

    // Re-open conversation if it was resolved/closed
    if (conversation.status === 'resolved' || conversation.status === 'closed') {
      conversation.status = 'open';
      this.logger.log(`Conversation ${conversation.id} re-opened due to new message`);
    }

    const savedConversation = await this.conversationRepository.save(conversation);

    // Extract media info from raw payload
    const rawMessage = payload.raw as any;
    let mediaUrl: string | undefined;
    let mediaType: string | undefined;
    let mimeType: string | undefined;
    let fileName: string | undefined;

    if (rawMessage?.hasMedia) {
      // WAHA Plus provides media URL directly in webhook
      if (rawMessage.media?.url) {
        mediaUrl = rawMessage.media.url;
        mimeType = rawMessage.media.mimetype || rawMessage.mimetype;
        fileName = rawMessage.media.filename || rawMessage.filename;
        this.logger.log(`Media URL from webhook: ${mediaUrl}`);

        // Download and save media locally
        if (mediaUrl) {
            const localUrl = await this.downloadAndSaveMedia(mediaUrl, fileName, mimeType);
            if (localUrl) {
                mediaUrl = localUrl;
                this.logger.log(`Media downloaded and saved locally at: ${localUrl}`);
            }
        }
      } else {
        mimeType = rawMessage.mimetype;
        fileName = rawMessage.filename;
      }

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
      text: payload.text || (mediaType ? `[${mediaType === 'image' ? 'Image' : mediaType === 'video' ? 'Video' : mediaType === 'audio' ? 'Audio' : 'Document'}]` : ''),
      ...(payload.senderName ? { senderName: payload.senderName } : {}),
      ...(payload.waMessageId ? { waMessageId: payload.waMessageId } : {}),
      ...(mediaUrl ? { mediaUrl } : {}),
      ...(mediaType ? { mediaType } : {}),
      ...(mimeType ? { mimeType } : {}),
      ...(fileName ? { fileName } : {}),
      ...(payload.raw ? { payload: payload.raw } : {}),
    });

    const savedMessage = await this.messageRepository.save(message);

    // Log conversation mode for debugging
    this.logger.log(`Conversation ${savedConversation.id} mode: ${savedConversation.mode}, has text: ${!!payload.text}`);

    // Check for Queue Status Check (Human Mode + Pending + No Owner)
    if (savedConversation.mode === 'human' && savedConversation.status === 'pending' && !savedConversation.owner) {
      const textLower = payload.text?.toLowerCase().trim();
      if (textLower === 'status' || textLower === 'antrian' || textLower === 'antrean' || textLower === 'cek antrian') {
         const position = await this.getQueuePosition(savedConversation.id);
         const replyText = `Posisi antrean Anda saat ini: *${position}*. Mohon bersabar, staf kami akan segera melayani Anda.`;
         
         await this.wahaService.sendText({
            chatId: savedConversation.waChatId,
            text: replyText,
         });

         // Save reply
         const replyMsg = this.messageRepository.create({
            conversation: savedConversation,
            direction: 'outgoing',
            text: replyText,
            repliedBy: 'ai',
            ackStatus: 'delivered'
         });
         await this.messageRepository.save(replyMsg);
         
         return savedMessage; // Return early, don't process AI
      }
    }

    // Check global AI setting
    const isAiEnabled = await this.settingsService.isAiEnabled();

    // Check if it's a group chat
    const isGroup = savedConversation.waChatId.endsWith('@g.us');

    // Only process AI classification if conversation is in AI mode AND global AI is enabled AND NOT a group
    if (savedConversation.mode === 'ai' && payload.text && isAiEnabled && !isGroup) {
      this.logger.log(`Processing AI classification for conversation ${savedConversation.id}`);
      
      // Call RAG service asynchronously (don't block webhook response)
      this.handleAiClassification(savedConversation, payload.text, payload.senderName)
        .catch(err => {
          this.logger.error(`AI classification failed: ${err.message}`);
        });
    } else {
      this.logger.log(`Skipping AI classification - mode: ${savedConversation.mode}, text: ${payload.text ? 'yes' : 'no'}, Global AI: ${isAiEnabled ? 'ON' : 'OFF'}`);
    }

    return savedMessage;
  }

  private async handleAiClassification(
    conversation: ConversationEntity,
    messageText: string,
    senderName?: string,
  ) {
    try {
      // Classify message intent
      const classification = await this.ragService.classifyMessage({
        sender_id: conversation.waChatId,
        message: messageText,
      });

      this.logger.log(`Classification result for ${conversation.waChatId}: ${classification.status}`);

      if (classification.status === 'ai_replied' && classification.reply) {
        // Send AI auto-reply
        this.logger.log(`Sending AI auto-reply to ${conversation.waChatId}`);
        
        const wahaResponse: any = await this.wahaService.sendText({
          chatId: conversation.waChatId,
          text: classification.reply,
        });

        // Save the AI reply message
        const aiMessage = this.messageRepository.create({
          conversation,
          direction: 'outgoing',
          text: classification.reply,
          waMessageId: wahaResponse?.id,
          ackStatus: 'pending',
          repliedBy: 'ai',
        });

        await this.messageRepository.save(aiMessage);

        // Update conversation with last AI reply timestamp
        conversation.lastAiReplyAt = new Date();
        await this.conversationRepository.save(conversation);

        this.logger.log(`AI auto-reply sent successfully to ${conversation.waChatId}`);
      } else if (classification.status === 'human_handoff' || classification.status === 'human_mode_active' || classification.status === 'handoff_initiated') {
        // Send handoff message if available (suggested response from RAG)
        if (classification.reply) {
            this.logger.log(`Sending handoff message to ${conversation.waChatId}: ${classification.reply}`);
            
            try {
                const wahaResponse: any = await this.wahaService.sendText({
                    chatId: conversation.waChatId,
                    text: classification.reply,
                });

                // Save the handoff message
                const handoffMessage = this.messageRepository.create({
                    conversation,
                    direction: 'outgoing',
                    text: classification.reply,
                    waMessageId: wahaResponse?.id,
                    ackStatus: 'pending',
                    repliedBy: 'ai', // AI sending the transition message
                });
                await this.messageRepository.save(handoffMessage);
            } catch (err) {
                this.logger.error(`Failed to send handoff message: ${err}`);
            }
        }

        // Switch to human mode using centralized logic (handles queue status)
        this.logger.log(`Switching conversation ${conversation.id} to human mode: ${classification.reason || 'human mode active'}`);
        
        await this.toggleAiMode(
            conversation.id, 
            'human', 
            classification.reason || 'User requested human assistance'
        );

        this.logger.log(`Conversation ${conversation.id} switched to human mode via handoff`);
      }
    } catch (error: any) {
      this.logger.error(`Error in AI classification: ${error?.message || error}`);
      throw error;
    }
  }

  private async downloadAndSaveMedia(url: string, originalFilename?: string, mimeType?: string): Promise<string | null> {
    try {
      this.logger.log(`Downloading media from: ${url}`);
      const apiKey = process.env.WAHA_API_KEY;
      
      const response = await fetch(url, {
        headers: {
          'X-Api-Key': apiKey || '',
        },
      });

      if (!response.ok) {
        this.logger.error(`Failed to download media: ${response.status} ${response.statusText}`);
        return null;
      }

      const buffer = await response.arrayBuffer();
      
      // Determine extension
      let extension = '';
      if (originalFilename) {
          extension = path.extname(originalFilename);
      }

      // If no extension from filename or it's just dot, try mimeType
      if (!extension || extension === '.') {
          if (mimeType) {
             if (mimeType.includes('image/jpeg') || mimeType.includes('jpg')) extension = '.jpg';
             else if (mimeType.includes('image/png')) extension = '.png';
             else if (mimeType.includes('image/webp')) extension = '.webp';
             else if (mimeType.includes('image/gif')) extension = '.gif';
             else if (mimeType.includes('video/mp4')) extension = '.mp4';
             else if (mimeType.includes('application/pdf')) extension = '.pdf';
             else if (mimeType.includes('audio/')) extension = '.mp3';
          }
          
          // Default to .bin if still unknown
          if (!extension) extension = '.bin';
      }

      const filename = `${Date.now()}_${randomBytes(8).toString('hex')}${extension}`;
      
      // Target directory: ../../uploads (relative to dist/messages/ or src/messages/)
      // Adjusting to point to root/uploads
      const uploadDir = path.join(__dirname, '..', '..', 'uploads'); 
      
      // Ensure directory exists
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filePath = path.join(uploadDir, filename);
      fs.writeFileSync(filePath, Buffer.from(buffer));
      
      this.logger.log(`Media saved to disk: ${filePath}`);
      
      // Return relative URL for frontend (served by ServeStaticModule)
      // Note: The ServeStaticModule serves from root '/uploads'
      // So if backend URL is http://localhost:4000, the file is at http://localhost:4000/uploads/filename
      return `http://localhost:4000/uploads/${filename}`;
    } catch (error) {
      this.logger.error(`Error downloading media: ${error}`);
      return null;
    }
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

  async getQueuePosition(conversationId: string): Promise<number> {
    const conversation = await this.conversationRepository.findOne({ where: { id: conversationId } });
    if (!conversation) return 0;

    // Count conversations that are in queue AND have older updatedAt (entered earlier)
    // Note: This is a simple FIFO based on last update. Chatting might push user to back.
    const count = await this.conversationRepository.count({
      where: {
        mode: 'human',
        status: 'pending',
        owner: IsNull(),
        updatedAt: LessThan(conversation.updatedAt),
        waChatId: Not(Like('%@broadcast')),
      }
    });

    return count + 1;
  }

  async toggleAiMode(conversationId: string, mode: 'ai' | 'human', reason?: string) {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: ['owner'],
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Check if queue is enabled when switching to human mode
    if (mode === 'human') {
      const queueEnabled = await this.settingsService.isQueueEnabled();
      if (!queueEnabled) {
        throw new HttpException(
          'Queue system is currently disabled. Cannot switch to human mode.',
          HttpStatus.FORBIDDEN
        );
      }

      // If switching to human mode and no owner assigned, move to queue (pending)
      if (!conversation.owner) {
        conversation.status = 'pending';
      } else {
        // If has owner, ensure it's open
        conversation.status = 'open';
      }
    } else {
      // Switching to AI mode
      conversation.status = 'open'; // AI handles open chats
      // Optional: Unassign owner when switching back to AI?
      // conversation.owner = null; 
    }

    conversation.mode = mode;
    if (reason) {
      conversation.handoffReason = reason;
    }

    await this.conversationRepository.save(conversation);

    // Send Queue Notification if entering queue
    if (mode === 'human' && !conversation.owner) {
      const position = await this.getQueuePosition(conversation.id);
      const queueMsg = `Mohon menunggu, Anda telah masuk antrean nomor *${position}*. Kami akan segera menghubungkan Anda dengan staf kami. (Ketik *status* untuk cek antrean)`;
      
      await this.wahaService.sendText({
        chatId: conversation.waChatId,
        text: queueMsg,
      });
      
      // Save outgoing system message
      const msg = this.messageRepository.create({
          conversation,
          direction: 'outgoing',
          text: queueMsg,
          ackStatus: 'delivered',
          repliedBy: 'ai',
      });
      await this.messageRepository.save(msg);
    }

    // If switching to AI mode, reset RAG service session
    if (mode === 'ai') {
      try {
        // Call RAG service to reset session (we'll use a dummy message to trigger reset)
        await this.ragService.classifyMessage({
          sender_id: conversation.waChatId,
          message: '__RESET_SESSION__', // Special message to reset
        });
        this.logger.log(`Reset RAG service session for ${conversation.waChatId}`);
      } catch (error: any) {
        this.logger.warn(`Failed to reset RAG session: ${error?.message}`);
      }
    }

    this.logger.log(`Conversation ${conversationId} mode changed to ${mode}`);

    return {
      success: true,
      conversationId,
      mode,
      reason,
    };
  }

  async proxyMedia(messageId: string, res: any) {
    try {
      // Find message by ID to get media URL
      const message = await this.messageRepository.findOne({
        where: { id: messageId },
      });

      if (!message || !message.mediaUrl) {
        return res.status(404).send('Media not found');
      }

      // If it's a data URL, extract and send
      if (message.mediaUrl.startsWith('data:')) {
        const matches = message.mediaUrl.match(/^data:(.+);base64,(.+)$/);
        if (matches && matches[2]) {
          const mimeType = matches[1];
          const base64Data = matches[2];
          const buffer = Buffer.from(base64Data, 'base64');
          res.setHeader('Content-Type', mimeType);
          return res.send(buffer);
        }
      }

      // If it's a WAHA URL, proxy it with API Key
      if (message.mediaUrl.startsWith('http')) {
        const apiKey = process.env.WAHA_API_KEY;
        const response = await fetch(message.mediaUrl, {
          headers: {
            'X-Api-Key': apiKey || '',
          },
        });
        
        if (!response.ok) {
          this.logger.error(`Failed to fetch media from WAHA: ${response.status} ${response.statusText}`);
          return res.status(response.status).send('Failed to fetch media from WAHA');
        }
        
        const buffer = await response.arrayBuffer();
        res.setHeader('Content-Type', message.mimeType || 'image/jpeg');
        return res.send(Buffer.from(buffer));
      }

      return res.status(404).send('Invalid media URL');
    } catch (error) {
      this.logger.error(`Failed to proxy media: ${error}`);
      return res.status(500).send('Failed to load media');
    }
  }

  async assignConversation(conversationId: string, userId: string) {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    conversation.owner = user;
    conversation.status = 'open'; // Mark as open when assigned
    conversation.unreadCount = 0; // Reset unread count when assigned (agent will read)
    await this.conversationRepository.save(conversation);

    this.logger.log(`Conversation ${conversationId} assigned to user ${userId}`);

    return {
      success: true,
      conversationId,
      assignedTo: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
      },
    };
  }

  async unassignConversation(conversationId: string) {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    conversation.owner = null;
    conversation.status = 'pending'; // Mark as pending when unassigned (back to queue)
    await this.conversationRepository.save(conversation);

    this.logger.log(`Conversation ${conversationId} unassigned (returned to queue)`);

    return {
      success: true,
      conversationId,
      message: 'Conversation returned to queue',
    };
  }

  async resolveConversation(conversationId: string, notes?: string) {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: ['owner'],
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const previousOwner = conversation.owner; // Store owner before unassigning

    // Mark as resolved but keep open for AI handling
    conversation.status = 'open'; 
    conversation.mode = 'ai'; // Switch back to AI mode
    conversation.owner = null; // Unassign owner
    conversation.resolvedAt = new Date();
    
    // Reset RAG session so AI starts fresh if user replies
    try {
      await this.ragService.classifyMessage({
        sender_id: conversation.waChatId,
        message: '__RESET_SESSION__',
      });
    } catch (error) {
      this.logger.warn(`Failed to reset RAG session on resolve: ${error}`);
    }

    if (notes) {
      conversation.resolutionNotes = notes;
    }

    await this.conversationRepository.save(conversation);

    this.logger.log(`Conversation ${conversationId} marked as resolved and switched to AI mode`);

    return {
      success: true,
      conversationId,
      message: 'Conversation marked as resolved',
      resolvedBy: previousOwner ? {
        id: previousOwner.id,
        username: previousOwner.username,
        fullName: previousOwner.fullName,
      } : null,
    };
  }

  async transferConversation(conversationId: string, fromUserId: string, toUserId: string) {
    const conversation = await this.conversationRepository.findOne({ 
      where: { id: conversationId },
      relations: ['owner']
    });

    if (!conversation) throw new Error('Conversation not found');

    // Validate ownership
    if (conversation.owner?.id !== fromUserId) {
      throw new Error('You can only transfer conversations assigned to you');
    }

    const targetUser = await this.userRepository.findOne({ where: { id: toUserId } });
    if (!targetUser) throw new Error('Target agent not found');

    const previousOwner = conversation.owner;
    conversation.owner = targetUser;
    // Ensure status is open
    conversation.status = 'open';

    await this.conversationRepository.save(conversation);
    this.logger.log(`Conversation ${conversationId} transferred from ${previousOwner?.username} to ${targetUser.username}`);

    return {
      conversationId,
      transferredFrom: previousOwner ? {
        id: previousOwner.id,
        username: previousOwner.username,
        fullName: previousOwner.fullName,
      } : null,
      transferredTo: {
        id: targetUser.id,
        username: targetUser.username,
        fullName: targetUser.fullName,
      }
    };
  }

  async deleteConversation(conversationId: string) {
    const conversation = await this.conversationRepository.findOne({ 
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Delete messages explicitly (if cascade not set)
    await this.messageRepository.delete({ conversation: { id: conversationId } });
    
    // Delete conversation
    await this.conversationRepository.delete(conversationId);
    
    this.logger.log(`Conversation ${conversationId} deleted`);

    return { success: true, id: conversationId };
  }

  async deleteMessage(messageId: string) {
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    await this.messageRepository.remove(message);
    this.logger.log(`Message ${messageId} deleted`);

    return { success: true, id: messageId };
  }
}
