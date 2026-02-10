import { Injectable, Logger } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { MeterTelemetry, VehicleTelemetry, MeterStatus, VehicleStatus, SmartMeterMapping } from './entities/telemetry.entity';

export interface MeterPayload {
    type: 'meter';
    meterId: string;
    kwhConsumedAc: number;
    voltage: number;
    // vehicleId removed for strict assignment compliance
    timestamp: string;
}

export interface VehiclePayload {
    type: 'vehicle';
    vehicleId: string;
    soc: number;
    kwhDeliveredDc: number;
    batteryTemp: number;
    timestamp: string;
}

export type TelemetryPayload = MeterPayload | VehiclePayload;

@Injectable()
export class IngestionService {
    private readonly logger = new Logger(IngestionService.name);

    constructor(
        // We use EntityManager for transactions and direct access
        @InjectEntityManager() private manager: EntityManager,
    ) { }

    async ingest(payload: TelemetryPayload) {
        // Transaction ensures atomicity between Hot and Cold storage updates
        await this.manager.transaction(async (transactionalEntityManager) => {
            if (payload.type === 'meter') {
                await this.handleMeter(payload, transactionalEntityManager);
            } else if (payload.type === 'vehicle') {
                await this.handleVehicle(payload, transactionalEntityManager);
            }
        });
    }

    private async handleMeter(data: MeterPayload, manager: EntityManager) {
        // Resolve vehicleId from mapping table
        const mapping = await manager.findOne(SmartMeterMapping, {
            where: { meterId: data.meterId }
        });

        const vehicleId = mapping ? mapping.vehicleId : null;

        if (!vehicleId) {
            this.logger.warn(`No vehicle mapping found for meter ${data.meterId}`);
        }

        // 1. COLD STORAGE (Append-Only History)
        const telemetry = manager.create(MeterTelemetry, {
            meterId: data.meterId,
            kwhConsumedAc: data.kwhConsumedAc,
            voltage: data.voltage,
            vehicleId: vehicleId,
            timestamp: new Date(data.timestamp),
        });
        await manager.save(telemetry);

        // 2. HOT STORAGE (Upsert - Latest State)
        await manager.createQueryBuilder()
            .insert()
            .into(MeterStatus)
            .values({
                meterId: data.meterId,
                lastKwhConsumedAc: data.kwhConsumedAc,
                lastVoltage: data.voltage,
                lastSeenAt: new Date(data.timestamp),
            })
            .orUpdate(
                ['lastKwhConsumedAc', 'lastVoltage', 'lastSeenAt', 'updatedAt'],
                ['meterId'] // PK Conflict Target
            )
            .execute();
    }

    private async handleVehicle(data: VehiclePayload, manager: EntityManager) {
        // 1. COLD STORAGE (Append-Only History)
        const telemetry = manager.create(VehicleTelemetry, {
            vehicleId: data.vehicleId,
            soc: data.soc,
            kwhDeliveredDc: data.kwhDeliveredDc,
            batteryTemp: data.batteryTemp,
            timestamp: new Date(data.timestamp),
        });
        await manager.save(telemetry);

        // 2. HOT STORAGE (Upsert - Latest State)
        await manager.createQueryBuilder()
            .insert()
            .into(VehicleStatus)
            .values({
                vehicleId: data.vehicleId,
                lastSoc: data.soc,
                lastKwhDeliveredDc: data.kwhDeliveredDc,
                lastBatteryTemp: data.batteryTemp,
                lastSeenAt: new Date(data.timestamp),
            })
            .orUpdate(
                ['lastSoc', 'lastKwhDeliveredDc', 'lastBatteryTemp', 'lastSeenAt', 'updatedAt'],
                ['vehicleId'] // PK Conflict Target
            )
            .execute();
    }
}
