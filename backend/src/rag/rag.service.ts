import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface ClassifyMessageRequest {
  sender_id: string;
  message: string;
}

export interface ClassifyMessageResponse {
  status: string; // 'ai_replied' | 'human_handoff' | 'ignored'
  reply?: string;
  reason?: string;
}

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);
  private readonly ragServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.ragServiceUrl = this.configService.get<string>('RAG_SERVICE_URL') || 'http://localhost:8001';
  }

  async classifyMessage(request: ClassifyMessageRequest): Promise<ClassifyMessageResponse> {
    try {
      this.logger.log(`Classifying message from ${request.sender_id}: "${request.message}"`);

      const response = await firstValueFrom(
        this.httpService.post<ClassifyMessageResponse>(
          `${this.ragServiceUrl}/webhook/whatsapp`,
          {
            sender_id: request.sender_id,
            message: request.message,
          },
          {
            timeout: 30000, // 30 seconds timeout
          }
        )
      );

      this.logger.log(`Classification result: ${response.data.status}`);

      return response.data;
    } catch (error: any) {
      this.logger.error(`Failed to classify message: ${error?.message || error}`);

      // Fallback to human handoff if RAG service is unavailable
      return {
        status: 'human_handoff',
        reason: 'RAG service unavailable',
      };
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.ragServiceUrl}/health`, {
          timeout: 5000,
        })
      );
      return response.status === 200;
    } catch (error: any) {
      this.logger.warn(`RAG service health check failed: ${error?.message || error}`);
      return false;
    }
  }


}
