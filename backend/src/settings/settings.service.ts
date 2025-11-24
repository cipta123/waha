import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SettingEntity } from '../database/entities/setting.entity';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    @InjectRepository(SettingEntity)
    private readonly settingRepository: Repository<SettingEntity>,
  ) {}

  async getSetting(key: string, defaultValue?: string): Promise<string | null> {
    const setting = await this.settingRepository.findOne({ where: { key } });
    
    if (setting) {
      return setting.value;
    }

    // Return default value if provided
    if (defaultValue !== undefined) {
      return defaultValue;
    }

    return null;
  }

  async setSetting(key: string, value: string, description?: string): Promise<SettingEntity> {
    const existing = await this.settingRepository.findOne({ where: { key } });

    if (existing) {
      existing.value = value;
      if (description) {
        existing.description = description;
      }
      const saved = await this.settingRepository.save(existing);
      this.logger.log(`Setting updated: ${key} = ${value}`);
      return saved;
    } else {
      const newSetting = this.settingRepository.create({
        key,
        value,
        ...(description && { description }),
      });
      const saved = await this.settingRepository.save(newSetting);
      this.logger.log(`Setting created: ${key} = ${value}`);
      return saved;
    }
  }

  async isQueueEnabled(): Promise<boolean> {
    // Check database first
    const dbValue = await this.getSetting('queue_enabled');
    
    if (dbValue !== null) {
      return dbValue === 'true';
    }

    // Fallback to environment variable
    const envValue = process.env.QUEUE_ENABLED;
    if (envValue !== undefined) {
      return envValue === 'true';
    }

    // Default to true if not set anywhere
    return true;
  }

  async setQueueEnabled(enabled: boolean): Promise<SettingEntity> {
    return this.setSetting('queue_enabled', String(enabled));
  }

  async isAiEnabled(): Promise<boolean> {
    const setting = await this.getSetting('ai_enabled');
    // Default to true if not set
    if (!setting) {
      // Fallback to env var if exists
      const envEnabled = process.env.AI_ENABLED;
      if (envEnabled !== undefined) {
        return envEnabled === 'true';
      }
      return true;
    }
    return setting === 'true';
  }

  async setAiEnabled(enabled: boolean): Promise<SettingEntity> {
    return this.setSetting('ai_enabled', String(enabled));
  }
}
