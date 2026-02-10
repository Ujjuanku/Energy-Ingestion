import { Controller, Post, Body, Get, Param, HttpException, HttpStatus } from '@nestjs/common';
import { IngestionService } from './ingestion.service';
import type { TelemetryPayload } from './ingestion.service';
import { AnalyticsService } from '../analytics/analytics.service';

@Controller('v1')
export class IngestionController {
    constructor(
        private readonly ingestionService: IngestionService,
        private readonly analyticsService: AnalyticsService,
    ) { }

    @Post('ingest')
    async ingest(@Body() payload: TelemetryPayload) {
        if (!payload.type || !payload.timestamp) {
            throw new HttpException('Invalid payload', HttpStatus.BAD_REQUEST);
        }
        await this.ingestionService.ingest(payload);
        return { status: 'accepted' };
    }

    @Get('analytics/performance/:vehicleId')
    async getPerformance(@Param('vehicleId') vehicleId: string) {
        return this.analyticsService.getVehiclePerformance(vehicleId);
    }
}
