import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';

export interface PerformanceMetrics {
  vehicleId: string;
  totalAcKwh: number;
  totalDcKwh: number;
  efficiencyRatio: number;
  avgBatteryTemp: number;
  totalSamples: number;
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectEntityManager() private entityManager: EntityManager,
  ) { }

  async getVehiclePerformance(vehicleId: string): Promise<PerformanceMetrics> {
    // Optimized Analytics Query
    // 1. Uses specific indexes on [vehicleId, timestamp] for both tables.
    // 2. Avoids full table scans.
    // 3. returns 0 if no data found (COALESCE).

    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const query = `
      WITH vehicle_stats AS (
        SELECT
          SUM("kwhDeliveredDc") as total_dc,
          AVG("batteryTemp") as avg_temp,
          COUNT(*) as v_count
        FROM vehicle_telemetry
        WHERE "vehicleId" = $1
          AND "timestamp" >= $2
      ),
      meter_stats AS (
        SELECT
          SUM("kwhConsumedAc") as total_ac
        FROM meter_telemetry
        WHERE "vehicleId" = $1
          AND "timestamp" >= $2
      )
      SELECT
        COALESCE(v.total_dc, 0) as "totalDc",
        COALESCE(v.avg_temp, 0) as "avgTemp",
        COALESCE(v.v_count, 0) as "sampleCount",
        COALESCE(m.total_ac, 0) as "totalAc"
      FROM vehicle_stats v
      CROSS JOIN meter_stats m;
    `;

    const result = await this.entityManager.query(query, [vehicleId, last24h]);
    const row = result[0];

    // Parse results (Postgres SUM/AVG returns strings or numbers depending on driver settings)
    const totalDc = parseFloat(row.totalDc);
    const totalAc = parseFloat(row.totalAc);
    const avgTemp = parseFloat(row.avgTemp);

    // Calculate Efficiency: Output / Input (DC / AC)
    // Guard against division by zero
    const efficiency = totalAc > 0 ? totalDc / totalAc : 0;

    return {
      vehicleId,
      totalAcKwh: Number(totalAc.toFixed(2)),
      totalDcKwh: Number(totalDc.toFixed(2)),
      efficiencyRatio: Number(efficiency.toFixed(4)),
      avgBatteryTemp: Number(avgTemp.toFixed(2)),
      totalSamples: parseInt(row.sampleCount, 10),
    };
  }
}
