import { Controller, Get, Delete, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { RegisterDto } from './dto/register.dto';

@Controller('users')
@UseGuards(AuthGuard('jwt')) // Protect all routes
export class UsersController {
  constructor(private authService: AuthService) {}

  @Get()
  findAll() {
    return this.authService.findAll();
  }

  @Post()
  create(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.authService.remove(id);
  }
}
