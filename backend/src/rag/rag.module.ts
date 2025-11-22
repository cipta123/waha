import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { RagService } from './rag.service';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [RagService],
  exports: [RagService],
})
export class RagModule {}
