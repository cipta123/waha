import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessagesController } from './messages.controller';
import { WebhookController } from './webhook.controller';
import { MessagesService } from './messages.service';
import { ConversationEntity } from '../database/entities/conversation.entity';
import { MessageEntity } from '../database/entities/message.entity';
import { UserEntity } from '../database/entities/user.entity';
import { WahaModule } from '../waha/waha.module';
import { RagModule } from '../rag/rag.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ConversationEntity, MessageEntity, UserEntity]),
    WahaModule,
    RagModule,
    SettingsModule,
  ],
  controllers: [MessagesController, WebhookController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
