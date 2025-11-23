import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { RagService } from './rag.service';

@Controller('rag')
export class RagController {
    constructor(private readonly ragService: RagService) { }

    @Get('prompt')
    async getSystemPrompt() {
        return this.ragService.getSystemPrompt();
    }

    @Post('prompt')
    async updateSystemPrompt(@Body() body: { system_prompt: string }) {
        return this.ragService.updateSystemPrompt(body.system_prompt);
    }
}
