import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ConversationEntity } from './conversation.entity';

export type MessageDirection = 'incoming' | 'outgoing';
export type MessageAckStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

@Entity('messages')
export class MessageEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => ConversationEntity, (conversation) => conversation.messages, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  conversation!: ConversationEntity;

  @Column({ type: 'enum', enum: ['incoming', 'outgoing'] })
  direction!: MessageDirection;

  @Column({ type: 'text' })
  text!: string;

  @Column({ nullable: true })
  senderName?: string;

  @Column({ nullable: true })
  waMessageId?: string;

  @Column({ 
    type: 'enum', 
    enum: ['pending', 'sent', 'delivered', 'read', 'failed'],
    default: 'pending',
    nullable: true 
  })
  ackStatus?: MessageAckStatus;

  @Column({ type: 'text', nullable: true })
  mediaUrl?: string;

  @Column({ nullable: true })
  mediaType?: string; // image, video, audio, document

  @Column({ nullable: true })
  mimeType?: string; // image/jpeg, image/png, etc

  @Column({ type: 'text', nullable: true })
  fileName?: string;

  @Column({ type: 'simple-json', nullable: true })
  payload?: Record<string, unknown>;

  @Column({ type: 'simple-json', nullable: true })
  quotedMsg?: {
    id: string;
    text: string;
    senderName?: string;
  };

  @Column({ 
    type: 'enum', 
    enum: ['human', 'ai'],
    nullable: true 
  })
  repliedBy?: 'human' | 'ai';

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
