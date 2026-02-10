import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IngestionController } from './ingestion/ingestion.controller';
import { IngestionService } from './ingestion/ingestion.service';
import { AnalyticsService } from './analytics/analytics.service';
import { MeterTelemetry, VehicleTelemetry, MeterStatus, VehicleStatus, SmartMeterMapping } from './ingestion/entities/telemetry.entity';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      autoLoadEntities: true,
      synchronize: false, // Production-grade requirement
      ssl: process.env.RENDER || process.env.DB_SSL ? { rejectUnauthorized: false } : false,
    }),
    TypeOrmModule.forFeature([
      MeterTelemetry,
      VehicleTelemetry,
      MeterStatus,
      VehicleStatus,
      SmartMeterMapping
    ]),
  ],
  controllers: [IngestionController],
  providers: [IngestionService, AnalyticsService],
})
export class AppModule { }
