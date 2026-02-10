import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1700000000000 implements MigrationInterface {
    name = 'InitialSchema1700000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

        // --- METER TELEMETRY (COLD) ---
        await queryRunner.query(`
            CREATE TABLE "meter_telemetry" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "meterId" character varying NOT NULL,
                "kwhConsumedAc" double precision NOT NULL,
                "voltage" double precision NOT NULL,
                "vehicleId" character varying,
                "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_meter_telemetry_id" PRIMARY KEY ("id")
            )
        `);
        // Index: Meter History
        await queryRunner.query(`CREATE INDEX "IDX_meter_telemetry_meterId_timestamp" ON "meter_telemetry" ("meterId", "timestamp")`);
        // Index: Analytics (Vehicle AC consumption)
        await queryRunner.query(`CREATE INDEX "IDX_meter_telemetry_vehicleId_timestamp" ON "meter_telemetry" ("vehicleId", "timestamp")`);
        // Index: Global Time-Series (Analytics)
        await queryRunner.query(`CREATE INDEX "IDX_meter_telemetry_timestamp" ON "meter_telemetry" ("timestamp")`);


        // --- VEHICLE TELEMETRY (COLD) ---
        await queryRunner.query(`
            CREATE TABLE "vehicle_telemetry" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "vehicleId" character varying NOT NULL,
                "soc" double precision NOT NULL,
                "kwhDeliveredDc" double precision NOT NULL,
                "batteryTemp" double precision NOT NULL,
                "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_vehicle_telemetry_id" PRIMARY KEY ("id")
            )
        `);
        // Index: Vehicle History
        await queryRunner.query(`CREATE INDEX "IDX_vehicle_telemetry_vehicleId_timestamp" ON "vehicle_telemetry" ("vehicleId", "timestamp")`);
        // Index: Global Time-Series
        await queryRunner.query(`CREATE INDEX "IDX_vehicle_telemetry_timestamp" ON "vehicle_telemetry" ("timestamp")`);


        // --- METER STATUS (HOT) ---
        await queryRunner.query(`
            CREATE TABLE "meter_status" (
                "meterId" character varying NOT NULL,
                "lastKwhConsumedAc" double precision NOT NULL,
                "lastVoltage" double precision NOT NULL,
                "lastSeenAt" TIMESTAMP WITH TIME ZONE NOT NULL,
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_meter_status_meterId" PRIMARY KEY ("meterId")
            )
        `);

        // --- VEHICLE STATUS (HOT) ---
        await queryRunner.query(`
            CREATE TABLE "vehicle_status" (
                "vehicleId" character varying NOT NULL,
                "lastSoc" double precision NOT NULL,
                "lastKwhDeliveredDc" double precision NOT NULL,
                "lastBatteryTemp" double precision NOT NULL,
                "lastSeenAt" TIMESTAMP WITH TIME ZONE NOT NULL,
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_vehicle_status_vehicleId" PRIMARY KEY ("vehicleId")
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "vehicle_status"`);
        await queryRunner.query(`DROP TABLE "meter_status"`);
        await queryRunner.query(`DROP TABLE "vehicle_telemetry"`);
        await queryRunner.query(`DROP TABLE "meter_telemetry"`);
    }
}
