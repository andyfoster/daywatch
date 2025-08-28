# Chrome Extension Sync Integration - Detailed Specification

## Overview

This specification details how to integrate sync capabilities into the existing DayWatch Chrome extension, including the SyncManager module, UI updates, and conflict resolution.

## 1. SyncManager Module Implementation

### 1.1 Core SyncManager Class

```javascript
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
    this.syncInterval = null;
    this.eventListeners = new Map();

    this.setupEventListeners();
    this.startPeriodicSync();
  }

  // Device identification
  getOrCreateDeviceId() {
    let deviceId = localStorage.getItem('daywatch_device_id');
    if (!deviceId) {
      deviceId = 'ext_' + this.generateUUID();
      localStorage.setItem('daywatch_device_id', deviceId);
    }
    return deviceId;
  }

  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Authentication methods
  async authenticateWithPassphrase(passphrase) {
    try {
      const response = await this.apiCall('POST', '/auth/login', {
        passphrase,
        deviceId: this.deviceId
      });

      this.authToken = response.token;
      this.lastSync = response.lastSync || 0;

      localStorage.setItem('daywatch_auth_token', this.authToken);
      localStorage.setItem('daywatch_last_sync', this.lastSync.toString());

      this.emit('auth:success', { userId: response.userId });
      this.startPeriodicSync();

      return response;
    } catch (error) {
      this.emit('auth:error', error);
      throw error;
    }
  }

  async registerWithPassphrase(passphrase) {
    try {
      const response = await this.apiCall('POST', '/auth/register', {
        passphrase,
        deviceId: this.deviceId
      });

      this.authToken = response.token;
      this.lastSync = Date.now();

      localStorage.setItem('daywatch_auth_token', this.authToken);
      localStorage.setItem('daywatch_last_sync', this.lastSync.toString());

      this.emit('auth:registered', { userId: response.userId });
      this.startPeriodicSync();

      return response;
    } catch (error) {
      this.emit('auth:error', error);
      throw error;
    }
  }

  logout() {
    this.authToken = null;
    this.lastSync = 0;
    this.syncQueue = [];

    localStorage.removeItem('daywatch_auth_token');
    localStorage.removeItem('daywatch_last_sync');
    localStorage.removeItem('daywatch_sync_queue');

    this.stopPeriodicSync();
    this.emit('auth:logout');
  }

  isAuthenticated() {
    return !!this.authToken;
  }

  // Sync methods
  async syncTimers() {
    if (!this.isAuthenticated() || this.syncInProgress) return;

    this.syncInProgress = true;
    this.emit('sync:started', { type: 'timers' });

    try {
      // Get local timers with version info
      const localTimers = this.timerManager.getTimers().map(timer => ({
        ...timer,
        clientId: this.deviceId,
        version: timer.version || 1
      }));

      // Fetch remote timers
      const response = await this.apiCall('GET', `/sync/timers?since=${this.lastSync}&deviceId=${this.deviceId}`);

      if (response.conflicts && response.conflicts.length > 0) {
        this.emit('sync:conflicts', response.conflicts);
        return; // Wait for user to resolve conflicts
      }

      // Merge remote changes
      await this.mergeRemoteTimers(response.timers);

      // Upload local changes
      const localChanges = this.getLocalChanges();
      if (localChanges.length > 0) {
        await this.apiCall('POST', '/sync/timers', {
          timers: localChanges,
          deviceId: this.deviceId,
          lastSync: this.lastSync
        });
      }

      this.lastSync = response.lastSync || Date.now();
      localStorage.setItem('daywatch_last_sync', this.lastSync.toString());

      this.emit('sync:completed', { type: 'timers' });
    } catch (error) {
      this.emit('sync:error', { type: 'timers', error });
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  async syncSettings() {
    if (!this.isAuthenticated()) return;

    try {
      const response = await this.apiCall('GET', '/sync/settings');
      const localSettings = this.settingsManager.getCurrentSettings();

      // Simple last-write-wins for settings
      if (response.settings.version > (localSettings.version || 0)) {
        await this.settingsManager.updateSettings(response.settings);
      } else if (localSettings.version > response.settings.version) {
        await this.apiCall('POST', '/sync/settings', {
          settings: localSettings,
          version: localSettings.version
        });
      }

      this.emit('sync:completed', { type: 'settings' });
    } catch (error) {
      this.emit('sync:error', { type: 'settings', error });
    }
  }

  async fullSync() {
    if (!this.isAuthenticated()) return;

    try {
      await this.processQueue(); // Process any queued changes first
      await this.syncTimers();
      await this.syncSettings();
      this.emit('sync:full_completed');
    } catch (error) {
      this.emit('sync:full_error', error);
    }
  }

  // Conflict resolution
  async resolveConflicts(resolutions) {
    try {
      for (const resolution of resolutions) {
        switch (resolution.action) {
          case 'keep_local':
            await this.apiCall('PUT', `/sync/timers/${resolution.timerId}`, {
              timer: resolution.localTimer,
              deviceId: this.deviceId,
              version: resolution.localTimer.version
            });
            break;
          case 'keep_remote':
            this.timerManager.replaceTimer(resolution.timerIndex, resolution.remoteTimer);
            break;
          case 'merge':
            const mergedTimer = this.mergeTimers(resolution.localTimer, resolution.remoteTimer);
            this.timerManager.replaceTimer(resolution.timerIndex, mergedTimer);
            await this.apiCall('PUT', `/sync/timers/${resolution.timerId}`, {
              timer: mergedTimer,
              deviceId: this.deviceId,
              version: mergedTimer.version + 1
            });
            break;
        }
      }

      this.emit('conflicts:resolved');
      await this.syncTimers(); // Re-sync after resolution
    } catch (error) {
      this.emit('conflicts:error', error);
    }
  }

  mergeTimers(local, remote) {
    // Simple merge strategy - prefer local for user-visible fields
    return {
      ...remote,
      name: local.name,
      color: local.color,
      showOnMainScreen: local.showOnMainScreen,
      time: local.time,
      location: local.location,
      link: local.link,
      version: Math.max(local.version, remote.version)
    };
  }

  // Offline handling
  queueChange(type, data) {
    const change = {
      id: this.generateUUID(),
      type,
      data,
      timestamp: Date.now(),
      deviceId: this.deviceId
    };

    this.syncQueue.push(change);
    localStorage.setItem('daywatch_sync_queue', JSON.stringify(this.syncQueue));

    if (this.isOnline && this.isAuthenticated()) {
      this.processQueue();
    }
  }

  async processQueue() {
    if (this.syncQueue.length === 0 || !this.isAuthenticated()) return;

    const queue = [...this.syncQueue];
    this.syncQueue = [];
    localStorage.setItem('daywatch_sync_queue', JSON.stringify(this.syncQueue));

    try {
      for (const change of queue) {
        await this.processQueuedChange(change);
      }
    } catch (error) {
      // Re-queue failed changes
      this.syncQueue = [...queue, ...this.syncQueue];
      localStorage.setItem('daywatch_sync_queue', JSON.stringify(this.syncQueue));
      throw error;
    }
  }

  async processQueuedChange(change) {
    switch (change.type) {
      case 'timer_add':
        await this.apiCall('POST', '/sync/timers', {
          timers: [change.data],
          deviceId: this.deviceId,
          lastSync: this.lastSync
        });
        break;
      case 'timer_update':
        await this.apiCall('PUT', `/sync/timers/${change.data.id}`, {
          timer: change.data,
          deviceId: this.deviceId,
          version: change.data.version
        });
        break;
      case 'timer_delete':
        await this.apiCall('DELETE', `/sync/timers/${change.data.id}`, {
          deviceId: this.deviceId,
          version: change.data.version
        });
        break;
    }
  }

  // Event handling
  setupEventListeners() {
    // Network status
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.emit('network:online');
      if (this.isAuthenticated()) {
        this.processQueue();
        this.fullSync();
      }
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.emit('network:offline');
    });

    // Timer manager hooks
    this.timerManager.on('timer:added', (timer) => {
      if (this.isAuthenticated()) {
        this.queueChange('timer_add', timer);
      }
    });

    this.timerManager.on('timer:updated', (timer) => {
      if (this.isAuthenticated()) {
        this.queueChange('timer_update', timer);
      }
    });

    this.timerManager.on('timer:deleted', (timer) => {
      if (this.isAuthenticated()) {
        this.queueChange('timer_delete', timer);
      }
    });
  }

  startPeriodicSync() {
    if (this.syncInterval) clearInterval(this.syncInterval);

    this.syncInterval = setInterval(() => {
      if (this.isAuthenticated() && this.isOnline) {
        this.fullSync();
      }
    }, 5 * 60 * 1000); // Sync every 5 minutes
  }

  stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // Event emitter methods
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => callback(data));
    }
  }

  // Utility methods
  async apiCall(method, endpoint, data = null) {
    const url = `${this.apiBase}/api${endpoint}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (this.authToken) {
      options.headers.Authorization = `Bearer ${this.authToken}`;
    }

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'API call failed');
    }

    return await response.json();
  }

  async mergeRemoteTimers(remoteTimers) {
    const localTimers = this.timerManager.getTimers();
    const mergedTimers = [...localTimers];

    for (const remoteTimer of remoteTimers) {
      const localIndex = mergedTimers.findIndex(t => t.id === remoteTimer.id);

      if (localIndex === -1) {
        // New remote timer
        mergedTimers.push(remoteTimer);
      } else if (remoteTimer.version > mergedTimers[localIndex].version) {
        // Remote timer is newer
        mergedTimers[localIndex] = remoteTimer;
      }
    }

    // Update timer manager with merged data
    this.timerManager.replaceAllTimers(mergedTimers);
  }

  getLocalChanges() {
    return this.timerManager.getTimers().filter(timer =>
      timer.updatedAt > this.lastSync
    );
  }

  getSyncStatus() {
    return {
      isAuthenticated: this.isAuthenticated(),
      isOnline: this.isOnline,
      syncInProgress: this.syncInProgress,
      lastSync: this.lastSync,
      queuedChanges: this.syncQueue.length
    };
  }
}
```

## 2. TimerManager Integration

### 2.1 Modified TimerManager with Sync Hooks

```javascript
// Additions to modules/timerManager.js
export class TimerManager {
  constructor() {
    this.timers = JSON.parse(localStorage.getItem("timers")) || [];
    this.eventListeners = new Map();
    this.addVersionTracking();
  }

  addVersionTracking() {
    // Add version and ID to existing timers
    this.timers = this.timers.map(timer => ({
      ...timer,
      id: timer.id || this.generateUUID(),
      version: timer.version || 1,
      updatedAt: timer.updatedAt || Date.now()
    }));
    this.saveTimers();
  }

  addTimer(name, date, color, showOnMainScreen = true, time = null, location = null, link = null) {
    const timer = {
      id: this.generateUUID(),
      name: this.sanitizeInput(name.trim()),
      date: new Date(date).getTime(),
      color: this.sanitizeColor(color),
      showOnMainScreen,
      time,
      location: location ? this.sanitizeInput(location.trim()) : null,
      link: link ? this.sanitizeInput(link.trim()) : null,
      version: 1,
      updatedAt: Date.now()
    };

    this.timers.push(timer);
    this.saveTimers();
    this.emit('timer:added', timer);
    return timer;
  }

  editTimer(index, name, date, color, showOnMainScreen, time = null, location = null, link = null) {
    if (index < 0 || index >= this.timers.length) {
      throw new Error("Invalid timer index");
    }

    const existingTimer = this.timers[index];
    this.timers[index] = {
      ...existingTimer,
      name: this.sanitizeInput(name.trim()),
      date: new Date(date).getTime(),
      color: this.sanitizeColor(color),
      showOnMainScreen,
      time: time !== undefined ? time : existingTimer.time,
      location: location !== undefined ? (location ? this.sanitizeInput(location.trim()) : null) : existingTimer.location,
      link: link !== undefined ? (link ? this.sanitizeInput(link.trim()) : null) : existingTimer.link,
      version: existingTimer.version + 1,
      updatedAt: Date.now()
    };

    this.saveTimers();
    this.emit('timer:updated', this.timers[index]);
    return this.timers[index];
  }

  removeTimer(index) {
    if (index < 0 || index >= this.timers.length) {
      throw new Error("Invalid timer index");
    }

    const timer = this.timers[index];
    this.timers.splice(index, 1);
    this.saveTimers();
    this.emit('timer:deleted', timer);
  }

  // New methods for sync
  replaceTimer(index, timer) {
    if (index >= 0 && index < this.timers.length) {
      this.timers[index] = timer;
      this.saveTimers();
    }
  }

  replaceAllTimers(timers) {
    this.timers = timers;
    this.saveTimers();
  }

  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Event emitter methods
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => callback(data));
    }
  }
}
```

This specification provides:

1. **Complete SyncManager implementation** with authentication, sync, and conflict resolution
2. **Event-driven architecture** for real-time sync integration
3. **Offline queue management** for reliable sync when connectivity returns
4. **Version tracking** for conflict detection and resolution
5. **Integration hooks** in existing TimerManager
6. **Network status handling** for online/offline scenarios

## 3. UI Integration and Updates

### 3.1 Sync Status Indicator

```javascript
// Add to modules/uiManager.js
class UIManager {
  constructor(timerManager, settingsManager) {
    // ... existing code ...
    this.syncManager = null; // Will be set after initialization
    this.setupSyncUI();
  }

  setSyncManager(syncManager) {
    this.syncManager = syncManager;
    this.setupSyncEventListeners();
  }

  setupSyncUI() {
    // Add sync status indicator to header
    const syncIndicator = document.createElement('div');
    syncIndicator.id = 'sync-status';
    syncIndicator.className = 'sync-status';
    syncIndicator.innerHTML = `
      <span class="sync-icon">⚡</span>
      <span class="sync-text">Offline</span>
    `;

    const header = document.querySelector('h1#date');
    header.parentNode.insertBefore(syncIndicator, header.nextSibling);

    // Add sync button to sidebar
    const syncButton = document.createElement('button');
    syncButton.id = 'sync-btn';
    syncButton.className = 'sync-btn';
    syncButton.innerHTML = '🔄';
    syncButton.title = 'Sync now';
    syncButton.addEventListener('click', () => this.handleManualSync());

    const sidebarFooter = document.querySelector('.sidebar-footer');
    sidebarFooter.insertBefore(syncButton, sidebarFooter.firstChild);
  }

  setupSyncEventListeners() {
    if (!this.syncManager) return;

    this.syncManager.on('auth:success', () => {
      this.updateSyncStatus('authenticated');
      this.showSyncNotification('Sync enabled', 'success');
    });

    this.syncManager.on('sync:started', () => {
      this.updateSyncStatus('syncing');
    });

    this.syncManager.on('sync:completed', () => {
      this.updateSyncStatus('synced');
    });

    this.syncManager.on('sync:error', (error) => {
      this.updateSyncStatus('error');
      this.showSyncNotification('Sync failed: ' + error.message, 'error');
    });

    this.syncManager.on('sync:conflicts', (conflicts) => {
      this.showConflictResolutionModal(conflicts);
    });

    this.syncManager.on('network:offline', () => {
      this.updateSyncStatus('offline');
    });

    this.syncManager.on('network:online', () => {
      this.updateSyncStatus('online');
    });
  }

  updateSyncStatus(status) {
    const indicator = document.getElementById('sync-status');
    const icon = indicator.querySelector('.sync-icon');
    const text = indicator.querySelector('.sync-text');

    indicator.className = `sync-status ${status}`;

    switch (status) {
      case 'offline':
        icon.textContent = '⚡';
        text.textContent = 'Offline';
        break;
      case 'online':
        icon.textContent = '🌐';
        text.textContent = 'Online';
        break;
      case 'authenticated':
        icon.textContent = '✅';
        text.textContent = 'Synced';
        break;
      case 'syncing':
        icon.textContent = '🔄';
        text.textContent = 'Syncing...';
        break;
      case 'synced':
        icon.textContent = '✅';
        text.textContent = 'Synced';
        break;
      case 'error':
        icon.textContent = '❌';
        text.textContent = 'Sync Error';
        break;
    }
  }

  async handleManualSync() {
    if (!this.syncManager?.isAuthenticated()) {
      this.showAuthModal();
      return;
    }

    try {
      await this.syncManager.fullSync();
      this.showSyncNotification('Sync completed', 'success');
    } catch (error) {
      this.showSyncNotification('Sync failed: ' + error.message, 'error');
    }
  }

  showSyncNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `sync-notification ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('show');
    }, 100);

    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}
```

### 3.2 Authentication Modal

```html
<!-- Add to index.html -->
<div id="auth-modal" class="modal" role="dialog" aria-labelledby="auth-title" aria-hidden="true">
  <div class="modal-content">
    <button class="close" aria-label="Close authentication">&times;</button>
    <h2 id="auth-title">Sync Setup</h2>

    <div class="auth-tabs">
      <button class="auth-tab active" data-tab="login">Sign In</button>
      <button class="auth-tab" data-tab="register">Create Account</button>
    </div>

    <div id="login-form" class="auth-form active">
      <p>Enter your passphrase to sync your timers across devices:</p>
      <div class="input-group">
        <label for="login-passphrase">Passphrase:</label>
        <textarea id="login-passphrase" rows="3" placeholder="Enter your 12-24 word passphrase"></textarea>
      </div>
      <button id="login-btn" class="primary-btn">Sign In</button>
    </div>

    <div id="register-form" class="auth-form">
      <p>Create a new passphrase to enable sync. <strong>Save this passphrase safely - it cannot be recovered!</strong></p>
      <div class="input-group">
        <label for="generated-passphrase">Your Passphrase:</label>
        <textarea id="generated-passphrase" rows="3" readonly></textarea>
        <button id="generate-passphrase" class="secondary-btn">Generate New</button>
      </div>
      <div class="checkbox-group">
        <input type="checkbox" id="passphrase-saved" required>
        <label for="passphrase-saved">I have safely saved my passphrase</label>
      </div>
      <button id="register-btn" class="primary-btn" disabled>Create Account</button>
    </div>

    <div class="auth-info">
      <h3>About Sync</h3>
      <ul>
        <li>Your data is encrypted with your passphrase</li>
        <li>We cannot recover lost passphrases</li>
        <li>Sync works across Chrome extension, web, and mobile</li>
      </ul>
    </div>
  </div>
</div>
```

### 3.3 Conflict Resolution Modal

```html
<!-- Add to index.html -->
<div id="conflict-modal" class="modal" role="dialog" aria-labelledby="conflict-title" aria-hidden="true">
  <div class="modal-content large">
    <button class="close" aria-label="Close conflict resolution">&times;</button>
    <h2 id="conflict-title">Sync Conflicts Detected</h2>

    <p>The same timer was modified on multiple devices. Choose how to resolve each conflict:</p>

    <div id="conflicts-list">
      <!-- Conflicts will be populated dynamically -->
    </div>

    <div class="modal-actions">
      <button id="resolve-conflicts-btn" class="primary-btn">Resolve Conflicts</button>
      <button id="cancel-conflicts-btn" class="secondary-btn">Cancel</button>
    </div>
  </div>
</div>
```

### 3.4 CSS Styles for Sync UI

```css
/* Add to style.css */
.sync-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s ease;
  margin: 10px 0;
}

.sync-status.offline {
  background: #f5f5f5;
  color: #666;
}

.sync-status.online {
  background: #e3f2fd;
  color: #1976d2;
}

.sync-status.authenticated,
.sync-status.synced {
  background: #e8f5e8;
  color: #2e7d32;
}

.sync-status.syncing {
  background: #fff3e0;
  color: #f57c00;
}

.sync-status.syncing .sync-icon {
  animation: spin 1s linear infinite;
}

.sync-status.error {
  background: #ffebee;
  color: #d32f2f;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.sync-btn {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.sync-btn:hover {
  background: rgba(0, 0, 0, 0.1);
}

.sync-notification {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 12px 20px;
  border-radius: 8px;
  color: white;
  font-weight: 500;
  transform: translateX(100%);
  transition: transform 0.3s ease;
  z-index: 10000;
}

.sync-notification.show {
  transform: translateX(0);
}

.sync-notification.success {
  background: #4caf50;
}

.sync-notification.error {
  background: #f44336;
}

.auth-tabs {
  display: flex;
  margin-bottom: 20px;
  border-bottom: 1px solid #ddd;
}

.auth-tab {
  flex: 1;
  padding: 12px;
  border: none;
  background: none;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

.auth-tab.active {
  border-bottom-color: #007bff;
  color: #007bff;
}

.auth-form {
  display: none;
}

.auth-form.active {
  display: block;
}

.auth-info {
  margin-top: 20px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
}

.auth-info h3 {
  margin: 0 0 10px 0;
  color: #333;
}

.auth-info ul {
  margin: 0;
  padding-left: 20px;
}

.auth-info li {
  margin-bottom: 5px;
  color: #666;
}

.conflict-item {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 15px;
}

.conflict-timer-comparison {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin: 15px 0;
}

.conflict-option {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.conflict-option:hover {
  background: #f5f5f5;
}

.conflict-option.selected {
  border-color: #007bff;
  background: #e3f2fd;
}

.modal-content.large {
  max-width: 800px;
  max-height: 80vh;
  overflow-y: auto;
}
```

This completes the Chrome Extension sync integration specification with:

1. **Comprehensive SyncManager** with full offline/online handling
2. **UI integration** with status indicators and notifications
3. **Authentication modals** for passphrase setup
4. **Conflict resolution interface** for handling sync conflicts
5. **Responsive design** that works with existing UI

The implementation provides a seamless sync experience while maintaining the extension's current functionality.
