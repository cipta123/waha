import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserEntity } from '../database/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private usersRepository: Repository<UserEntity>,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersRepository.findOne({ where: { username } });
    if (user && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { username: user.username, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
      }
    };
  }

  async register(registerDto: RegisterDto) {
    // Check if user exists
    const existing = await this.usersRepository.findOne({ 
        where: { username: registerDto.username } 
    });
    if (existing) {
        throw new ConflictException('Username already exists');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const user = this.usersRepository.create({
      ...registerDto,
      password: hashedPassword,
    });

    await this.usersRepository.save(user);
    
    const { password, ...result } = user;
    return result;
  }

  async findAll() {
    return this.usersRepository.find({
      select: ['id', 'username', 'fullName', 'role', 'createdAt'],
      order: { createdAt: 'DESC' }
    });
  }

  async remove(id: string) {
    return this.usersRepository.delete(id);
  }
  
  // Helper to seed initial admin if empty
  async seedInitialAdmin() {
    const count = await this.usersRepository.count();
    if (count === 0) {
        // Create ICT Director default
        const admin = {
            username: 'admin',
            password: 'password123',
            fullName: 'ICT Director',
            role: 'ict' as any, 
        };
        const hashedPassword = await bcrypt.hash(admin.password, 10);
        const user = this.usersRepository.create({
            ...admin,
            password: hashedPassword,
        });
        await this.usersRepository.save(user);
        console.log('Seeded initial admin user: admin/password123');
    }
  }
}
