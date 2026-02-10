# High-Scale Energy Ingestion Engine

<p align="center">
  <img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" />
</p>

## Executive Summary
This project implements a high-scale ingestion backend for a Fleet platform managing 10,000+ Smart Meters and EV Fleets. It is designed to handle **14.4 million daily records** (10k devices * 1440 mins) with a focus on write throughput and instant analytical insights.

## Architecture & Design Choices

### 1. Data Strategy: "Hot & Cold" Storage
To balance high-frequency writes with fast dashboard reads, I implemented a split storage strategy using PostgreSQL:

*   **Cold Storage (History)**: `meter_telemetry`, `vehicle_telemetry`
    *   **Purpose**: Audit trail, historical reporting.
    *   **Operation**: Append-Only (`INSERT`).
    *   **Optimization**: Indexed by `[vehicleId, timestamp]` for efficient range queries. In a production environment, this would be partitioned by time (e.g., monthly) to maintain performance as data grows into the billions.
*   **Hot Storage (Live)**: `meter_status`, `vehicle_status`
    *   **Purpose**: Real-time dashboards (e.g., "Current SoC", "Active Charging").
    *   **Operation**: Upsert (`ON CONFLICT`).
    *   **Optimization**: Small table size (1 row per device). Guarantees O(1) lookup time for current status, avoiding expensive scans of historical data.

### 2. Polymorphic Ingestion
The `IngestionService` handles two distinct telemetry streams via a single pipeline.
*   **Transactions**: A database transaction ensures atomicity. If the "Cold" insert succeeds but the "Hot" update fails, the entire operation rolls back to maintain consistency.
*   **Data Correlation Strategy**: The system uses a `smart_meter_mapping` table to resolve `meterId` to `vehicleId`. This ensures the ingestion API remains strictly compliant with the hardware payload definition (which does not report vehicle identity directly) while correctly linking the two data streams for analytics.

### 3. Analytics Performance
The `GET /analytics/performance/:vehicleId` endpoint allows fleet operators to analyze efficiency (DC Delivered / AC Consumed).
*   **Optimization**: The SQL query utilizes **Composite Indexes** to aggregate millions of rows in milliseconds.
*   **Efficiency**: It avoids full table scans by constraining the `SUM()` and `AVG()` operations to specific time ranges (last 24h) and IDs.

## Scale Handling (14.4M Records/Day)
*   **Write Throughput**: Postgres can comfortably handle ~160 inserts/second (14.4M / 86400). The "Hot/Cold" split prevents index bloat on the status tables, keeping updates fast.
*   **Read Scalability**: Dashboard queries hit the small "Hot" tables, ensuring sub-10ms response times regardless of historical data volume.

## Project Setup

### Prerequisites
*   Node.js (v18+)
*   Docker & Docker Compose

### Installation
```bash
$ npm install
```

### Running the Stack (Local Development)
1.  **Start Database & API**:
    ```bash
    $ docker-compose up -d postgres
    $ npm run start:dev
    ```
2.  **Run Migrations**:
    ```bash
    $ npx typeorm-ts-node-commonjs migration:run -d src/data-source.ts
    ```

### Verification (Curl Commands)

**1. Ingest Meter Data (AC)**
```bash
curl -X POST http://localhost:3000/v1/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "type": "meter",
    "meterId": "m-123",
    "kwhConsumedAc": 50.5,
    "voltage": 240,
    "timestamp": "2023-10-27T10:00:00Z"
  }'
```

**2. Ingest Vehicle Data (DC)**
```bash
curl -X POST http://localhost:3000/v1/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "type": "vehicle",
    "vehicleId": "v-tesla-01",
    "soc": 85.0,
    "kwhDeliveredDc": 48.0,
    "batteryTemp": 35.2,
    "timestamp": "2023-10-27T10:00:00Z"
  }'
```

**3. Check Analytics**
```bash
curl http://localhost:3000/v1/analytics/performance/v-tesla-01
```

## Deployment Guide (Render)

This project is configured for deployment on Render.

### 1. Database (Render PostgreSQL)
*   Create a **New PostgreSQL** service on Render.
*   Copy the `Internal Database URL` (for efficient internal networking) or `External Database URL`.

### 2. Web Service (Docker)
*   Create **New Web Service** -> **Build and deploy from a Git repository**.
*   **Environment**: Docker.
*   **Environment Variables**:
    *   `DATABASE_URL`: Your Render Postgres Connection String.
    *   `DB_SSL`: `true` (Required for managed Postgres).
    *   `PORT`: `3000` (Optional, Render detects EXPOSE).

### 3. Migrations
Run migrations as part of the build command or manually via the Render Shell:
```bash
$ npx typeorm-ts-node-commonjs migration:run -d src/data-source.ts
```

## License
MIT
