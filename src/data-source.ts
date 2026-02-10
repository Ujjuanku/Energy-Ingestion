import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { MeterTelemetry, VehicleTelemetry, MeterStatus, VehicleStatus, SmartMeterMapping } from './ingestion/entities/telemetry.entity';

config(); // Load .env file if it exists

export const AppDataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/energy',
    entities: [MeterTelemetry, VehicleTelemetry, MeterStatus, VehicleStatus, SmartMeterMapping],
    migrations: [__dirname + '/migrations/*.ts'],
    synchronize: false, // Production: always false, we use migrations
    ssl: process.env.RENDER || process.env.DB_SSL ? { rejectUnauthorized: false } : false,
});
