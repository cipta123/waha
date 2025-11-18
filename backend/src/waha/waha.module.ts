import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WahaService } from './waha.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
    }),
  ],
  providers: [WahaService],
  exports: [WahaService],
})
export class WahaModule {}
