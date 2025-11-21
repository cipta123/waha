import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { UserEntity } from './user.entity';
import { MessageEntity } from './message.entity';

@Entity('conversations')
export class ConversationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  waChatId!: string;

  @Column({ default: 'open' })
  status!: 'open' | 'pending' | 'closed';

  @Column({ nullable: true })
  title?: string;

  @Column({ nullable: true })
  lastMessageAt?: Date;

  @Column({ default: 0 })
  unreadCount!: number;

  @Column({ default: 'ai' })
  mode!: 'ai' | 'human';

  @Column({ nullable: true })
  lastAiReplyAt?: Date;

  @Column({ nullable: true })
  handoffReason?: string;

  @ManyToOne(() => UserEntity, (user) => user.conversations, { nullable: true })
  owner?: UserEntity | null;

  @OneToMany(() => MessageEntity, (message) => message.conversation)
  messages?: MessageEntity[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
