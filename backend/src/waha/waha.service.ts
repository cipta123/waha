import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

interface SendTextPayload {
  chatId: string;
  text: string;
  session?: string;
}

@Injectable()
export class WahaService {
  private readonly logger = new Logger(WahaService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  private get baseUrl() {
    return this.configService.get<string>('WAHA_BASE_URL', 'http://localhost:3000');
  }

  private get apiKey() {
    return this.configService.get<string>('WAHA_API_KEY');
  }

  async sendText(payload: SendTextPayload) {
    const body = {
      session: payload.session ?? this.configService.get('WAHA_DEFAULT_SESSION', 'default'),
      chatId: payload.chatId,
      text: payload.text,
    };

    return this.request('POST', '/api/sendText', body);
  }

  async sendImage(payload: { chatId: string; file: { mimetype: string; data: string }; caption?: string; session?: string }) {
    const body = {
      session: payload.session ?? this.configService.get('WAHA_DEFAULT_SESSION', 'default'),
      chatId: payload.chatId,
      file: payload.file,
      caption: payload.caption || '',
    };

    return this.request('POST', '/api/sendImage', body);
  }

  async listSessions() {
    return this.request('GET', '/api/sessions');
  }

  async startSession(sessionId: string) {
    return this.request('POST', `/api/${sessionId}/start`);
  }

  async stopSession(sessionId: string) {
    return this.request('POST', `/api/${sessionId}/stop`);
  }

  async request<T>(method: 'GET' | 'POST', path: string, data?: unknown): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['X-Api-Key'] = this.apiKey;
    }

    const url = `${this.baseUrl}${path}`;

    this.logger.debug(`${method} ${url}`);

    const response = await firstValueFrom(
      this.httpService.request<T>({
        method,
        url,
        data,
        headers,
      }),
    );

    return response.data;
  }
}
