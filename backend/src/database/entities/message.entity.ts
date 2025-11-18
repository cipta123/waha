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

  @Column({ type: 'json', nullable: true })
  payload?: Record<string, unknown>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
