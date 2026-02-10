import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMapping1700000000001 implements MigrationInterface {
    name = 'AddMapping1700000000001'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "smart_meter_mapping" (
                "meterId" character varying NOT NULL,
                "vehicleId" character varying NOT NULL,
                CONSTRAINT "PK_smart_meter_mapping_meterId" PRIMARY KEY ("meterId")
            )
        `);

        // Seed default mapping for the assignment
        await queryRunner.query(`INSERT INTO "smart_meter_mapping" ("meterId", "vehicleId") VALUES ('m-123', 'v-tesla-01')`);
        await queryRunner.query(`INSERT INTO "smart_meter_mapping" ("meterId", "vehicleId") VALUES ('meter-02', 'vehicle-02')`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "smart_meter_mapping"`);
    }
}
