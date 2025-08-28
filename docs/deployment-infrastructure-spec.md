# DayWatch Deployment & Infrastructure - Detailed Specification

## Overview

This specification details the deployment strategy, infrastructure requirements, CI/CD pipeline, monitoring, and scaling considerations for the DayWatch sync platform.

## 1. Infrastructure Architecture

### 1.1 Production Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Cloudflare CDN                       │
│                    (Global Edge Caching)                    │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────┐
│                    Load Balancer                            │
│                 (Railway/Render)                            │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
┌───────▼──────┐ ┌────▼────┐ ┌──────▼──────┐
│   Web App    │ │ API     │ │  API        │
│  (Vercel)    │ │ Server  │ │ Server      │
│              │ │ (Node1) │ │ (Node2)     │
└──────────────┘ └────┬────┘ └──────┬──────┘
                      │             │
                ┌─────┴─────────────┴─────┐
                │                         │
        ┌───────▼──────┐         ┌────────▼────────┐
        │ PostgreSQL   │         │    Redis        │
        │ (Primary)    │         │   (Cache)       │
        └──────────────┘         └─────────────────┘
```

### 1.2 Technology Stack

```yaml
# Infrastructure Components
Frontend:
  - Platform: Vercel (Serverless)
  - CDN: Cloudflare
  - Domain: Custom domain with SSL

Backend API:
  - Platform: Railway or Render
  - Runtime: Node.js 18+ LTS
  - Framework: Express.js
  - Process Manager: PM2

Database:
  - Primary: PostgreSQL 14+
  - Cache: Redis 7+
  - Backup: Automated daily backups

Monitoring:
  - Application: Sentry (Error tracking)
  - Infrastructure: Railway/Render built-in
  - Uptime: UptimeRobot
  - Logs: Structured logging with Winston

Security:
  - SSL: Let's Encrypt (automatic)
  - WAF: Cloudflare security rules
  - Rate Limiting: Express-rate-limit
  - Secrets: Environment variables
```

## 2. Environment Configuration

### 2.1 Environment Variables

```bash
# Production Environment (.env.production)
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://user:pass@host:5432/daywatch_prod
REDIS_URL=redis://user:pass@host:6379

# Security
JWT_SECRET=your-super-secure-jwt-secret-256-bits
ENCRYPTION_MASTER_KEY=your-32-byte-encryption-master-key
ARGON2_SECRET=your-argon2-pepper-key

# API Configuration
API_BASE_URL=https://api.daywatch.app
CORS_ORIGINS=https://daywatch.app,https://www.daywatch.app

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX=5

# Monitoring
SENTRY_DSN=https://your-sentry-dsn
LOG_LEVEL=info

# Feature Flags
ENABLE_REGISTRATION=true
ENABLE_SYNC=true
MAINTENANCE_MODE=false
```

### 2.2 Staging Environment

```bash
# Staging Environment (.env.staging)
NODE_ENV=staging
PORT=3000

# Database (separate staging DB)
DATABASE_URL=postgresql://user:pass@host:5432/daywatch_staging
REDIS_URL=redis://user:pass@host:6379

# Relaxed rate limits for testing
RATE_LIMIT_MAX_REQUESTS=1000
AUTH_RATE_LIMIT_MAX=20

# Debug logging
LOG_LEVEL=debug
```

## 3. CI/CD Pipeline

### 3.1 GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy DayWatch

on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '18'

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: daywatch_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linting
        run: npm run lint
      
      - name: Run tests
        run: npm test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/daywatch_test
      
      - name: Run security audit
        run: npm audit --audit-level moderate

  deploy-staging:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/staging'
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Deploy to Railway (Staging)
        uses: railway-app/railway-deploy@v1
        with:
          railway-token: ${{ secrets.RAILWAY_TOKEN_STAGING }}
          service: daywatch-api-staging
      
      - name: Deploy Web App (Staging)
        uses: vercel/action@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-args: '--prod --scope=daywatch-staging'

  deploy-production:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Deploy to Railway (Production)
        uses: railway-app/railway-deploy@v1
        with:
          railway-token: ${{ secrets.RAILWAY_TOKEN_PROD }}
          service: daywatch-api
      
      - name: Deploy Web App (Production)
        uses: vercel/action@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-args: '--prod'
      
      - name: Notify deployment
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
        if: always()

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high
```

### 3.2 Database Migrations

```javascript
// migrations/migrate.js
const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

class MigrationRunner {
  constructor(databaseUrl) {
    this.pool = new Pool({ connectionString: databaseUrl });
  }

  async runMigrations() {
    try {
      // Create migrations table if it doesn't exist
      await this.createMigrationsTable();
      
      // Get list of migration files
      const migrationFiles = await this.getMigrationFiles();
      
      // Get applied migrations
      const appliedMigrations = await this.getAppliedMigrations();
      
      // Run pending migrations
      for (const file of migrationFiles) {
        if (!appliedMigrations.includes(file)) {
          await this.runMigration(file);
        }
      }
      
      console.log('All migrations completed successfully');
    } catch (error) {
      console.error('Migration failed:', error);
      process.exit(1);
    } finally {
      await this.pool.end();
    }
  }

  async createMigrationsTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT NOW()
      )
    `;
    await this.pool.query(query);
  }

  async getMigrationFiles() {
    const migrationsDir = path.join(__dirname, 'sql');
    const files = await fs.readdir(migrationsDir);
    return files
      .filter(file => file.endsWith('.sql'))
      .sort();
  }

  async getAppliedMigrations() {
    const result = await this.pool.query('SELECT version FROM schema_migrations');
    return result.rows.map(row => row.version);
  }

  async runMigration(filename) {
    const filePath = path.join(__dirname, 'sql', filename);
    const sql = await fs.readFile(filePath, 'utf8');
    
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        'INSERT INTO schema_migrations (version) VALUES ($1)',
        [filename]
      );
      await client.query('COMMIT');
      console.log(`Applied migration: ${filename}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

// Run migrations if called directly
if (require.main === module) {
  const runner = new MigrationRunner(process.env.DATABASE_URL);
  runner.runMigrations();
}

module.exports = MigrationRunner;
```

## 4. Monitoring & Observability

### 4.1 Application Monitoring

```javascript
// src/monitoring/monitoring.js
const Sentry = require('@sentry/node');
const winston = require('winston');

class MonitoringService {
  constructor() {
    this.setupSentry();
    this.setupLogging();
    this.setupMetrics();
  }

  setupSentry() {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      beforeSend(event) {
        // Filter out sensitive data
        if (event.request?.data) {
          delete event.request.data.passphrase;
          delete event.request.data.token;
        }
        return event;
      }
    });
  }

  setupLogging() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'daywatch-api' },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ]
    });
  }

  setupMetrics() {
    this.metrics = {
      requests: 0,
      errors: 0,
      authAttempts: 0,
      syncOperations: 0,
      responseTime: []
    };
  }

  logRequest(req, res, responseTime) {
    this.metrics.requests++;
    this.metrics.responseTime.push(responseTime);
    
    this.logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
  }

  logError(error, context = {}) {
    this.metrics.errors++;
    
    this.logger.error('Application Error', {
      error: error.message,
      stack: error.stack,
      ...context
    });
    
    Sentry.captureException(error, { extra: context });
  }

  logAuthAttempt(success, userId = null, ip = null) {
    this.metrics.authAttempts++;
    
    this.logger.info('Authentication Attempt', {
      success,
      userId,
      ip,
      timestamp: new Date().toISOString()
    });
  }

  logSyncOperation(operation, userId, deviceId, success) {
    this.metrics.syncOperations++;
    
    this.logger.info('Sync Operation', {
      operation,
      userId,
      deviceId,
      success,
      timestamp: new Date().toISOString()
    });
  }

  getMetrics() {
    const avgResponseTime = this.metrics.responseTime.length > 0
      ? this.metrics.responseTime.reduce((a, b) => a + b) / this.metrics.responseTime.length
      : 0;

    return {
      ...this.metrics,
      avgResponseTime,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = new MonitoringService();
```

### 4.2 Health Check Endpoints

```javascript
// src/routes/health.js
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

router.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  };

  try {
    // Check database connectivity
    const dbResult = await pool.query('SELECT 1');
    health.database = 'connected';
  } catch (error) {
    health.status = 'error';
    health.database = 'disconnected';
    health.error = error.message;
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

router.get('/metrics', (req, res) => {
  const monitoring = require('../monitoring/monitoring');
  res.json(monitoring.getMetrics());
});

module.exports = router;
```

## 5. Scaling Considerations

### 5.1 Horizontal Scaling

```yaml
# Railway scaling configuration
services:
  api:
    build:
      dockerfile: Dockerfile
    deploy:
      replicas: 2
      resources:
        limits:
          memory: 1Gi
          cpu: 1000m
        requests:
          memory: 512Mi
          cpu: 500m
    healthcheck:
      path: /api/health
      interval: 30s
      timeout: 10s
      retries: 3
```

### 5.2 Database Optimization

```sql
-- Performance indexes
CREATE INDEX CONCURRENTLY idx_timers_user_updated 
ON timers(user_id, updated_at DESC);

CREATE INDEX CONCURRENTLY idx_timers_date_range 
ON timers(date_timestamp) 
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY idx_sync_sessions_lookup 
ON sync_sessions(user_id, device_id, last_sync_timestamp);

-- Partitioning for audit logs (if needed)
CREATE TABLE audit_log_2024 PARTITION OF audit_log
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
```

### 5.3 Caching Strategy

```javascript
// src/middleware/cache.js
const redis = require('redis');
const client = redis.createClient({ url: process.env.REDIS_URL });

class CacheManager {
  constructor() {
    this.defaultTTL = 300; // 5 minutes
  }

  async get(key) {
    try {
      const value = await client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key, value, ttl = this.defaultTTL) {
    try {
      await client.setEx(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async del(key) {
    try {
      await client.del(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  // Cache middleware for Express
  middleware(ttl = this.defaultTTL) {
    return async (req, res, next) => {
      const key = `cache:${req.method}:${req.originalUrl}:${req.user?.id || 'anonymous'}`;
      
      const cached = await this.get(key);
      if (cached) {
        return res.json(cached);
      }

      // Override res.json to cache the response
      const originalJson = res.json;
      res.json = function(data) {
        if (res.statusCode === 200) {
          cache.set(key, data, ttl);
        }
        return originalJson.call(this, data);
      };

      next();
    };
  }
}

module.exports = new CacheManager();
```

## 6. Cost Optimization

### 6.1 Resource Allocation

```yaml
# Cost-optimized configuration
Production:
  API Servers: 2x 1GB RAM, 1 CPU ($10-20/month)
  Database: PostgreSQL 2GB ($15/month)
  Redis Cache: 256MB ($5/month)
  CDN: Cloudflare Free
  Web Hosting: Vercel Free tier
  Monitoring: Sentry Free tier (10k errors/month)
  
Total Monthly Cost: $30-40

Staging:
  API Server: 1x 512MB RAM ($5/month)
  Database: Shared PostgreSQL ($0-5/month)
  
Total Staging Cost: $5-10/month
```

### 6.2 Auto-scaling Rules

```javascript
// Auto-scaling based on metrics
const SCALING_RULES = {
  scaleUp: {
    cpuThreshold: 70,    // Scale up if CPU > 70%
    memoryThreshold: 80, // Scale up if memory > 80%
    responseTime: 1000,  // Scale up if avg response > 1s
    minReplicas: 1,
    maxReplicas: 5
  },
  
  scaleDown: {
    cpuThreshold: 30,    // Scale down if CPU < 30%
    memoryThreshold: 50, // Scale down if memory < 50%
    responseTime: 200,   // Scale down if avg response < 200ms
    cooldownPeriod: 300  // Wait 5 minutes before scaling down
  }
};
```

This deployment specification provides:

1. **Production-ready infrastructure** with proper scaling and monitoring
2. **Automated CI/CD pipeline** with testing and security checks
3. **Comprehensive monitoring** with error tracking and metrics
4. **Cost-optimized architecture** suitable for startup/indie development
5. **Security-first deployment** with proper secrets management

The infrastructure is designed to handle growth from initial launch to thousands of users while maintaining cost efficiency and reliability.
