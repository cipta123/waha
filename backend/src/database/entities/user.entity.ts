import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { ConversationEntity } from './conversation.entity';

export enum UserRole {
  ICT = 'ict',
  DIRECTOR = 'director',
  MANAGER = 'manager',
  CS = 'cs',
  STAFF = 'staff',
}

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  username!: string;

  @Column({ nullable: true })
  email?: string;

  @Column()
  password!: string;

  @Column()
  fullName!: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.STAFF,
  })
  role!: UserRole;

  @OneToMany(() => ConversationEntity, (conversation) => conversation.owner)
  conversations?: ConversationEntity[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
