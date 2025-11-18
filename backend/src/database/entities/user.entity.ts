import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { ConversationEntity } from './conversation.entity';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ nullable: true })
  displayName?: string;

  @Column({ default: 'agent' })
  role!: 'agent' | 'admin';

  @OneToMany(() => ConversationEntity, (conversation) => conversation.owner)
  conversations?: ConversationEntity[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
