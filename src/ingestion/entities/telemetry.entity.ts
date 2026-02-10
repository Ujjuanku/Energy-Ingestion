import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

// --- COLD STORAGE (History - Append Only) ---
// Optimized for: Range queries, Analytics aggregation
// Maintenance: Partitioning by time (e.g., monthly) recommended for production scale.

@Entity('meter_telemetry')
@Index(['meterId', 'timestamp']) // Specific meter history
@Index(['vehicleId', 'timestamp']) // Optimize analytics queries (finding AC for a vehicle)
@Index(['timestamp'])            // Global time-series analysis
export class MeterTelemetry {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    meterId: string;

    @Column('float')
    kwhConsumedAc: number;

    @Column('float')
    voltage: number;

    // Linked vehicle for efficiency calculation (optional)
    @Column({ type: 'varchar', nullable: true })
    vehicleId: string | null;

    @Column('timestamptz')
    timestamp: Date;

    @CreateDateColumn()
    createdAt: Date;
}

@Entity('vehicle_telemetry')
@Index(['vehicleId', 'timestamp']) // Specific vehicle history
@Index(['timestamp'])              // Global time-series analysis
export class VehicleTelemetry {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    vehicleId: string;

    @Column('float')
    soc: number;

    @Column('float')
    kwhDeliveredDc: number;

    @Column('float')
    batteryTemp: number;

    @Column('timestamptz')
    timestamp: Date;

    @CreateDateColumn()
    createdAt: Date;
}

// --- HOT STORAGE (Current State - Upsert) ---
// Optimized for: Real-time Dashboards, Latest Status
// Maintenance: Small table size (1 row per device).

@Entity('meter_status')
export class MeterStatus {
    @PrimaryColumn() // meterId is the PK
    meterId: string;

    @Column('float')
    lastKwhConsumedAc: number;

    @Column('float')
    lastVoltage: number;

    @Column('timestamptz')
    lastSeenAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}

@Entity('vehicle_status')
export class VehicleStatus {
    @PrimaryColumn() // vehicleId is the PK
    vehicleId: string;

    @Column('float')
    lastSoc: number;

    @Column('float')
    lastKwhDeliveredDc: number;

    @Column('float')
    lastBatteryTemp: number;

    @Column('timestamptz')
    lastSeenAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}

@Entity('smart_meter_mapping')
export class SmartMeterMapping {
    @PrimaryColumn()
    meterId: string;

    @Column()
    vehicleId: string;
}
