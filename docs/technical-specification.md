# DayWatch Online Sync - Technical Specification

## Overview

This specification outlines the technical requirements for extending DayWatch from a Chrome extension to a full sync-enabled platform with web and mobile access using passphrase-based authentication.

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Chrome Ext     │    │   Web App       │    │   Mobile App    │
│  (Existing)     │    │   (New)         │    │   (New)         │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────┴───────────┐
                    │     Sync API Server     │
                    │   (Node.js/Express)     │
                    └─────────────┬───────────┘
                                  │
                    ┌─────────────┴───────────┐
                    │     PostgreSQL DB       │
                    │   (Encrypted Storage)   │
                    └─────────────────────────┘
```

## 1. Backend API Server Specification

### 1.1 Technology Stack
- **Runtime**: Node.js 18+ with Express.js
- **Database**: PostgreSQL 14+ with encryption at rest
- **Authentication**: Custom passphrase-based with Argon2id
- **API Format**: RESTful JSON API
- **Validation**: Joi or Zod for request validation
- **Logging**: Winston with structured logging
- **Rate Limiting**: Express-rate-limit

### 1.2 Database Schema

```sql
-- Users table (passphrase-based identification)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    passphrase_hash VARCHAR(255) NOT NULL UNIQUE,
    salt VARCHAR(255) NOT NULL,
    encryption_key_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    last_sync_at TIMESTAMP DEFAULT NOW(),
    device_count INTEGER DEFAULT 1
);

-- Timers table
CREATE TABLE timers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name_encrypted TEXT NOT NULL,
    date_timestamp BIGINT NOT NULL,
    color VARCHAR(7) NOT NULL,
    show_on_main_screen BOOLEAN DEFAULT true,
    time_value VARCHAR(5),
    location_encrypted TEXT,
    link_encrypted TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP NULL,
    client_id VARCHAR(255), -- For conflict resolution
    version INTEGER DEFAULT 1
);

-- Settings table
CREATE TABLE user_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    date_format VARCHAR(10) DEFAULT 'long',
    display_font VARCHAR(50) DEFAULT 'Roboto Condensed',
    language VARCHAR(5) DEFAULT 'en',
    hide_timers BOOLEAN DEFAULT false,
    updated_at TIMESTAMP DEFAULT NOW(),
    version INTEGER DEFAULT 1
);

-- Sync sessions for conflict resolution
CREATE TABLE sync_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    device_id VARCHAR(255) NOT NULL,
    last_sync_timestamp BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 1.3 API Endpoints

#### Authentication
```
POST /api/auth/login
Body: { passphrase: string }
Response: { token: string, userId: string, lastSync: timestamp }

POST /api/auth/register  
Body: { passphrase: string, deviceId: string }
Response: { token: string, userId: string }

POST /api/auth/verify
Headers: { Authorization: "Bearer <token>" }
Response: { valid: boolean, userId: string }
```

#### Timer Sync
```
GET /api/sync/timers
Headers: { Authorization: "Bearer <token>" }
Query: { since?: timestamp, deviceId: string }
Response: { 
  timers: Timer[], 
  lastSync: timestamp,
  conflicts?: ConflictInfo[]
}

POST /api/sync/timers
Headers: { Authorization: "Bearer <token>" }
Body: { 
  timers: Timer[], 
  deviceId: string,
  lastSync: timestamp 
}
Response: { 
  success: boolean, 
  conflicts?: ConflictInfo[],
  newLastSync: timestamp 
}

PUT /api/sync/timers/:id
Headers: { Authorization: "Bearer <token>" }
Body: { timer: Timer, deviceId: string, version: number }
Response: { success: boolean, conflict?: ConflictInfo }

DELETE /api/sync/timers/:id
Headers: { Authorization: "Bearer <token>" }
Body: { deviceId: string, version: number }
Response: { success: boolean }
```

#### Settings Sync
```
GET /api/sync/settings
Headers: { Authorization: "Bearer <token>" }
Response: { settings: UserSettings, version: number }

POST /api/sync/settings
Headers: { Authorization: "Bearer <token>" }
Body: { settings: UserSettings, version: number }
Response: { success: boolean, newVersion: number }
```

### 1.4 Data Models

```typescript
interface Timer {
  id: string;
  name: string;
  date: number; // timestamp
  color: string;
  showOnMainScreen: boolean;
  time?: string;
  location?: string;
  link?: string;
  version: number;
  updatedAt: number;
  deletedAt?: number;
}

interface UserSettings {
  dateFormat: 'long' | 'short' | 'full';
  displayFont: string;
  language: string;
  hideTimers: boolean;
  version: number;
}

interface ConflictInfo {
  timerId: string;
  localVersion: number;
  serverVersion: number;
  localTimer: Timer;
  serverTimer: Timer;
  conflictType: 'update' | 'delete';
}

interface SyncResponse {
  timers: Timer[];
  settings: UserSettings;
  lastSync: number;
  conflicts: ConflictInfo[];
}
```

## 2. Chrome Extension Sync Integration

### 2.1 New SyncManager Module

```typescript
// modules/syncManager.js
export class SyncManager {
  constructor(timerManager, settingsManager) {
    this.timerManager = timerManager;
    this.settingsManager = settingsManager;
    this.apiBase = 'https://api.daywatch.app';
    this.deviceId = this.getOrCreateDeviceId();
    this.authToken = localStorage.getItem('daywatch_auth_token');
    this.lastSync = parseInt(localStorage.getItem('daywatch_last_sync') || '0');
    this.syncQueue = JSON.parse(localStorage.getItem('daywatch_sync_queue') || '[]');
    this.isOnline = navigator.onLine;
    this.syncInProgress = false;
    
    this.setupEventListeners();
    this.startPeriodicSync();
  }

  // Authentication methods
  async authenticateWithPassphrase(passphrase) { /* ... */ }
  async registerWithPassphrase(passphrase) { /* ... */ }
  
  // Sync methods
  async syncTimers() { /* ... */ }
  async syncSettings() { /* ... */ }
  async fullSync() { /* ... */ }
  
  // Conflict resolution
  async resolveConflicts(conflicts) { /* ... */ }
  
  // Offline handling
  queueChange(type, data) { /* ... */ }
  async processQueue() { /* ... */ }
  
  // Event handling
  setupEventListeners() { /* ... */ }
  startPeriodicSync() { /* ... */ }
}
```

### 2.2 Integration Points

**Modified TimerManager:**
- Add sync hooks to `addTimer()`, `editTimer()`, `removeTimer()`
- Add conflict resolution methods
- Add version tracking for each timer

**Modified SettingsManager:**
- Add sync hooks to `updateSettings()`
- Add version tracking for settings

**UI Updates:**
- Sync status indicator in header
- Conflict resolution modal
- Passphrase setup/login modal
- Offline indicator

### 2.3 Conflict Resolution Strategy

**Last-Write-Wins with User Choice:**
1. Detect conflicts during sync
2. Present conflict resolution UI to user
3. Allow user to choose: keep local, keep remote, or merge
4. Apply resolution and continue sync

## 3. Security & Authentication Design

### 3.1 Passphrase System

**Passphrase Requirements:**
- 12-24 words from BIP39 wordlist
- Minimum entropy: 128 bits
- User-friendly generation with word suggestions

**Key Derivation:**
```
User Passphrase → Argon2id → Master Key
Master Key → HKDF → [Auth Key, Encryption Key]
Auth Key → Server Authentication
Encryption Key → Client-side data encryption
```

**Implementation:**
```typescript
// Passphrase to keys derivation
async function deriveKeys(passphrase: string, salt: Uint8Array) {
  const masterKey = await argon2id(passphrase, salt, {
    memory: 64 * 1024, // 64MB
    iterations: 3,
    parallelism: 1,
    hashLength: 32
  });
  
  const authKey = await hkdf(masterKey, salt, 'auth', 32);
  const encryptionKey = await hkdf(masterKey, salt, 'encryption', 32);
  
  return { authKey, encryptionKey };
}
```

### 3.2 Data Encryption

**Client-Side Encryption:**
- Encrypt sensitive fields (name, location, link) before sending to server
- Use AES-256-GCM with per-field random IVs
- Server never sees plaintext sensitive data

**Server-Side Security:**
- Store only hashed authentication keys
- Use parameterized queries to prevent SQL injection
- Implement rate limiting and request validation
- Enable HTTPS only with HSTS headers

## 4. Web/Mobile App Specification

### 4.1 Architecture

**Shared Components:**
- Reuse existing timer management logic
- Adapt UI components for responsive design
- Progressive Web App (PWA) for mobile experience

**Technology Stack:**
- **Framework**: Vanilla JS (matching extension) or React/Vue for enhanced features
- **Build Tool**: Vite for fast development and building
- **PWA**: Service Worker for offline functionality
- **Styling**: CSS Grid/Flexbox with mobile-first approach

### 4.2 Mobile Optimizations

**UI Adaptations:**
- Touch-friendly button sizes (44px minimum)
- Swipe gestures for timer management
- Pull-to-refresh for manual sync
- Bottom navigation for easy thumb access

**Performance:**
- Lazy loading of timer lists
- Virtual scrolling for large timer collections
- Optimized images and assets
- Service Worker caching

## 5. Deployment & Infrastructure

### 5.1 Hosting Requirements

**Backend API:**
- **Platform**: Railway, Render, or DigitalOcean App Platform
- **Resources**: 1GB RAM, 1 CPU core (scalable)
- **Database**: PostgreSQL with automated backups
- **SSL**: Automatic HTTPS with Let's Encrypt

**Web App:**
- **Platform**: Vercel, Netlify, or Cloudflare Pages
- **CDN**: Global edge caching for static assets
- **Domain**: Custom domain with SSL

### 5.2 CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy DayWatch
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test

  deploy-api:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Railway
        run: railway deploy

  deploy-web:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Vercel
        run: vercel deploy --prod
```

### 5.3 Monitoring & Observability

**Application Monitoring:**
- Health check endpoints
- Error tracking with Sentry
- Performance monitoring
- Database query optimization

**Security Monitoring:**
- Rate limiting alerts
- Failed authentication tracking
- Unusual access pattern detection

## 6. Development Phases

### Phase 1: Backend Foundation (2-3 weeks)
- Set up Node.js/Express API server
- Implement PostgreSQL database schema
- Create authentication system
- Build basic CRUD endpoints for timers

### Phase 2: Chrome Extension Integration (1-2 weeks)
- Develop SyncManager module
- Integrate sync with existing TimerManager
- Add authentication UI
- Implement conflict resolution

### Phase 3: Web Application (2-3 weeks)
- Create responsive web version
- Implement PWA features
- Add mobile optimizations
- Deploy to production

### Phase 4: Testing & Polish (1-2 weeks)
- End-to-end testing
- Performance optimization
- Security audit
- Documentation

**Total Estimated Timeline: 6-10 weeks**

## 7. Cost Analysis

**Development Costs:**
- Backend development: 40-60 hours
- Frontend integration: 20-30 hours
- Web app development: 40-60 hours
- Testing & deployment: 20-30 hours

**Monthly Operating Costs:**
- API hosting (Railway): $5-20/month
- Database (PostgreSQL): Included
- Web hosting (Vercel): Free tier sufficient
- Domain: $10-15/year
- SSL certificates: Free (Let's Encrypt)

**Total Monthly: $5-20 + domain costs**

This specification provides a comprehensive roadmap for transforming DayWatch into a fully synchronized, multi-platform application while maintaining security and user privacy through passphrase-based authentication.
