import { Controller, Get, Post, Body } from '@nestjs/common';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('queue-enabled')
  async getQueueEnabled() {
    const enabled = await this.settingsService.isQueueEnabled();
    return {
      enabled,
      message: enabled ? 'Queue system is enabled' : 'Queue system is disabled',
    };
  }

  @Post('queue-enabled')
  async setQueueEnabled(@Body() body: { enabled: boolean }) {
    await this.settingsService.setQueueEnabled(body.enabled);
    return {
      success: true,
      enabled: body.enabled,
      message: body.enabled ? 'Queue system enabled' : 'Queue system disabled',
    };
  }

  @Get('ai-enabled')
  async getAiEnabled() {
    const enabled = await this.settingsService.isAiEnabled();
    return {
      enabled,
      message: enabled ? 'AI system is enabled' : 'AI system is disabled',
    };
  }

  @Post('ai-enabled')
  async setAiEnabled(@Body() body: { enabled: boolean }) {
    await this.settingsService.setAiEnabled(body.enabled);
    return {
      success: true,
      enabled: body.enabled,
      message: body.enabled ? 'AI system enabled' : 'AI system disabled',
    };
  }
}
