import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessagesController } from './messages.controller';
import { WebhookController } from './webhook.controller';
import { MessagesService } from './messages.service';
import { ConversationEntity } from '../database/entities/conversation.entity';
import { MessageEntity } from '../database/entities/message.entity';
import { WahaModule } from '../waha/waha.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ConversationEntity, MessageEntity]),
    WahaModule,
  ],
  controllers: [MessagesController, WebhookController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
