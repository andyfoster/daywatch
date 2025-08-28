# DayWatch Backend API - Detailed Specification

## Project Structure

```
daywatch-api/
├── src/
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── timersController.js
│   │   └── settingsController.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── validation.js
│   │   ├── rateLimiting.js
│   │   └── encryption.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Timer.js
│   │   └── Settings.js
│   ├── services/
│   │   ├── authService.js
│   │   ├── syncService.js
│   │   └── encryptionService.js
│   ├── utils/
│   │   ├── database.js
│   │   ├── logger.js
│   │   └── crypto.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── sync.js
│   │   └── health.js
│   └── app.js
├── migrations/
├── tests/
├── package.json
├── docker-compose.yml
└── README.md
```

## Dependencies

```json
{
  "name": "daywatch-api",
  "version": "1.0.0",
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.0",
    "argon2": "^0.31.0",
    "jsonwebtoken": "^9.0.0",
    "joi": "^17.9.0",
    "helmet": "^7.0.0",
    "cors": "^2.8.5",
    "express-rate-limit": "^6.7.0",
    "winston": "^3.9.0",
    "crypto": "^1.0.1",
    "node-cron": "^3.0.2",
    "dotenv": "^16.1.4"
  },
  "devDependencies": {
    "jest": "^29.5.0",
    "supertest": "^6.3.3",
    "nodemon": "^2.0.22"
  }
}
```

## Environment Configuration

```bash
# .env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/daywatch
JWT_SECRET=your-super-secret-jwt-key-here
ENCRYPTION_KEY=your-32-byte-encryption-key-here
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
CORS_ORIGIN=https://daywatch.app,chrome-extension://your-extension-id
```

## Database Migrations

```sql
-- migrations/001_initial_schema.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    passphrase_hash VARCHAR(255) NOT NULL UNIQUE,
    salt VARCHAR(255) NOT NULL,
    encryption_key_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_sync_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    device_count INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_users_passphrase_hash ON users(passphrase_hash);
CREATE INDEX idx_users_last_sync ON users(last_sync_at);

-- Timers table
CREATE TABLE timers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name_encrypted TEXT NOT NULL,
    date_timestamp BIGINT NOT NULL,
    color VARCHAR(7) NOT NULL CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
    show_on_main_screen BOOLEAN DEFAULT true,
    time_value VARCHAR(5) CHECK (time_value ~ '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'),
    location_encrypted TEXT,
    link_encrypted TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE NULL,
    client_id VARCHAR(255) NOT NULL,
    version INTEGER DEFAULT 1,
    iv_name VARCHAR(255) NOT NULL,
    iv_location VARCHAR(255),
    iv_link VARCHAR(255)
);

CREATE INDEX idx_timers_user_id ON timers(user_id);
CREATE INDEX idx_timers_updated_at ON timers(updated_at);
CREATE INDEX idx_timers_deleted_at ON timers(deleted_at);

-- Settings table
CREATE TABLE user_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    date_format VARCHAR(10) DEFAULT 'long' CHECK (date_format IN ('long', 'short', 'full')),
    display_font VARCHAR(50) DEFAULT 'Roboto Condensed',
    language VARCHAR(5) DEFAULT 'en',
    hide_timers BOOLEAN DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    version INTEGER DEFAULT 1
);

-- Sync sessions for conflict resolution
CREATE TABLE sync_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id VARCHAR(255) NOT NULL,
    last_sync_timestamp BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, device_id)
);

CREATE INDEX idx_sync_sessions_user_device ON sync_sessions(user_id, device_id);

-- Audit log for security monitoring
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);
CREATE INDEX idx_audit_log_action ON audit_log(action);
```

## Core Services Implementation

### Authentication Service

```javascript
// src/services/authService.js
const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User } = require('../models/User');

class AuthService {
  async hashPassphrase(passphrase) {
    const salt = crypto.randomBytes(32);
    const hash = await argon2.hash(passphrase, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16, // 64MB
      timeCost: 3,
      parallelism: 1,
      salt
    });
    return { hash, salt: salt.toString('hex') };
  }

  async verifyPassphrase(passphrase, hash, salt) {
    return await argon2.verify(hash, passphrase, {
      salt: Buffer.from(salt, 'hex')
    });
  }

  generateToken(userId) {
    return jwt.sign(
      { userId, type: 'access' },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  async register(passphrase, deviceId) {
    const { hash, salt } = await this.hashPassphrase(passphrase);
    const encryptionKeyHash = crypto.createHash('sha256')
      .update(passphrase + salt)
      .digest('hex');

    const user = await User.create({
      passphraseHash: hash,
      salt,
      encryptionKeyHash,
      deviceCount: 1
    });

    const token = this.generateToken(user.id);
    return { user, token };
  }

  async login(passphrase) {
    const { hash, salt } = await this.hashPassphrase(passphrase);
    const user = await User.findByPassphraseHash(hash);
    
    if (!user || !await this.verifyPassphrase(passphrase, user.passphraseHash, user.salt)) {
      throw new Error('Invalid credentials');
    }

    await user.updateLastSync();
    const token = this.generateToken(user.id);
    return { user, token };
  }
}

module.exports = new AuthService();
```

### Encryption Service

```javascript
// src/services/encryptionService.js
const crypto = require('crypto');

class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32;
    this.ivLength = 16;
    this.tagLength = 16;
  }

  deriveKey(passphrase, salt) {
    return crypto.pbkdf2Sync(passphrase, salt, 100000, this.keyLength, 'sha256');
  }

  encrypt(text, key) {
    if (!text) return { encrypted: null, iv: null, tag: null };
    
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipher(this.algorithm, key);
    cipher.setAAD(Buffer.from('daywatch-data'));
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex')
    };
  }

  decrypt(encryptedData, key) {
    if (!encryptedData.encrypted) return null;
    
    const decipher = crypto.createDecipher(this.algorithm, key);
    decipher.setAAD(Buffer.from('daywatch-data'));
    decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

module.exports = new EncryptionService();
```

## API Controllers

### Timers Controller

```javascript
// src/controllers/timersController.js
const { Timer } = require('../models/Timer');
const syncService = require('../services/syncService');
const encryptionService = require('../services/encryptionService');

class TimersController {
  async getTimers(req, res) {
    try {
      const { since, deviceId } = req.query;
      const userId = req.user.id;
      
      const timers = await Timer.findByUserId(userId, since);
      const conflicts = await syncService.detectConflicts(userId, deviceId, timers);
      
      // Decrypt timer data before sending
      const decryptedTimers = timers.map(timer => 
        this.decryptTimer(timer, req.user.encryptionKey)
      );
      
      res.json({
        timers: decryptedTimers,
        lastSync: Date.now(),
        conflicts
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async syncTimers(req, res) {
    try {
      const { timers, deviceId, lastSync } = req.body;
      const userId = req.user.id;
      
      // Encrypt timer data before storing
      const encryptedTimers = timers.map(timer => 
        this.encryptTimer(timer, req.user.encryptionKey)
      );
      
      const result = await syncService.syncTimers(userId, encryptedTimers, deviceId, lastSync);
      
      res.json({
        success: true,
        conflicts: result.conflicts,
        newLastSync: Date.now()
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  encryptTimer(timer, encryptionKey) {
    const nameData = encryptionService.encrypt(timer.name, encryptionKey);
    const locationData = encryptionService.encrypt(timer.location, encryptionKey);
    const linkData = encryptionService.encrypt(timer.link, encryptionKey);
    
    return {
      ...timer,
      nameEncrypted: nameData.encrypted,
      ivName: nameData.iv,
      locationEncrypted: locationData.encrypted,
      ivLocation: locationData.iv,
      linkEncrypted: linkData.encrypted,
      ivLink: linkData.iv
    };
  }

  decryptTimer(timer, encryptionKey) {
    const name = encryptionService.decrypt({
      encrypted: timer.nameEncrypted,
      iv: timer.ivName,
      tag: timer.tagName
    }, encryptionKey);
    
    const location = encryptionService.decrypt({
      encrypted: timer.locationEncrypted,
      iv: timer.ivLocation,
      tag: timer.tagLocation
    }, encryptionKey);
    
    const link = encryptionService.decrypt({
      encrypted: timer.linkEncrypted,
      iv: timer.ivLink,
      tag: timer.tagLink
    }, encryptionKey);
    
    return {
      id: timer.id,
      name,
      date: timer.dateTimestamp,
      color: timer.color,
      showOnMainScreen: timer.showOnMainScreen,
      time: timer.timeValue,
      location,
      link,
      version: timer.version,
      updatedAt: timer.updatedAt
    };
  }
}

module.exports = new TimersController();
```

## API Routes

```javascript
// src/routes/sync.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const validation = require('../middleware/validation');
const timersController = require('../controllers/timersController');
const settingsController = require('../controllers/settingsController');

// Timer sync routes
router.get('/timers', auth, timersController.getTimers);
router.post('/timers', auth, validation.validateTimersSync, timersController.syncTimers);
router.put('/timers/:id', auth, validation.validateTimerUpdate, timersController.updateTimer);
router.delete('/timers/:id', auth, timersController.deleteTimer);

// Settings sync routes
router.get('/settings', auth, settingsController.getSettings);
router.post('/settings', auth, validation.validateSettings, settingsController.syncSettings);

module.exports = router;
```

## Validation Schemas

```javascript
// src/middleware/validation.js
const Joi = require('joi');

const timerSchema = Joi.object({
  id: Joi.string().uuid(),
  name: Joi.string().required().max(200),
  date: Joi.number().integer().positive().required(),
  color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).required(),
  showOnMainScreen: Joi.boolean().default(true),
  time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).allow(null),
  location: Joi.string().max(500).allow(null),
  link: Joi.string().uri().max(2000).allow(null),
  version: Joi.number().integer().positive().default(1)
});

const validateTimersSync = (req, res, next) => {
  const schema = Joi.object({
    timers: Joi.array().items(timerSchema).required(),
    deviceId: Joi.string().required().max(255),
    lastSync: Joi.number().integer().positive().required()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  next();
};

module.exports = { validateTimersSync };
```

This detailed backend specification provides:

1. **Complete project structure** with organized modules
2. **Database schema** with proper indexing and constraints
3. **Security-focused authentication** with Argon2 and JWT
4. **End-to-end encryption** for sensitive data
5. **Comprehensive API endpoints** for sync operations
6. **Conflict resolution** mechanisms
7. **Input validation** and error handling
8. **Audit logging** for security monitoring

The implementation prioritizes security, scalability, and maintainability while providing a robust foundation for the DayWatch sync system.
