# DayWatch Web/Mobile App - Detailed Specification

## Overview

This specification details the responsive web application that will provide DayWatch functionality across all devices, with particular focus on mobile optimization and Progressive Web App (PWA) capabilities.

## 1. Project Structure

```
daywatch-web/
├── public/
│   ├── manifest.json
│   ├── sw.js (Service Worker)
│   ├── icons/
│   │   ├── icon-192.png
│   │   ├── icon-512.png
│   │   └── apple-touch-icon.png
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Timer/
│   │   │   ├── TimerCard.js
│   │   │   ├── TimerForm.js
│   │   │   └── TimerList.js
│   │   ├── UI/
│   │   │   ├── Modal.js
│   │   │   ├── Button.js
│   │   │   ├── Input.js
│   │   │   └── Notification.js
│   │   ├── Sync/
│   │   │   ├── SyncStatus.js
│   │   │   ├── AuthModal.js
│   │   │   └── ConflictResolver.js
│   │   └── Layout/
│   │       ├── Header.js
│   │       ├── Navigation.js
│   │       └── Container.js
│   ├── modules/ (shared with extension)
│   │   ├── timerManager.js
│   │   ├── settingsManager.js
│   │   ├── syncManager.js
│   │   └── translations.js
│   ├── styles/
│   │   ├── global.css
│   │   ├── components.css
│   │   ├── mobile.css
│   │   └── themes.css
│   ├── utils/
│   │   ├── dateUtils.js
│   │   ├── storage.js
│   │   └── pwa.js
│   ├── app.js
│   └── main.js
├── package.json
├── vite.config.js
└── README.md
```

## 2. Technology Stack

### 2.1 Core Technologies
```json
{
  "name": "daywatch-web",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "vite": "^5.0.0",
    "workbox-window": "^7.0.0",
    "idb": "^8.0.0"
  },
  "devDependencies": {
    "@vitejs/plugin-pwa": "^0.17.0",
    "vite-plugin-pwa": "^0.17.0"
  }
}
```

### 2.2 Build Configuration
```javascript
// vite.config.js
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.daywatch\.app\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              }
            }
          }
        ]
      },
      manifest: {
        name: 'DayWatch - Countdown Tracker',
        short_name: 'DayWatch',
        description: 'Track days until your important events',
        theme_color: '#007bff',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  build: {
    target: 'es2015',
    outDir: 'dist',
    sourcemap: true
  }
});
```

## 3. Responsive Design System

### 3.1 Breakpoints and Layout
```css
/* src/styles/global.css */
:root {
  /* Breakpoints */
  --mobile: 480px;
  --tablet: 768px;
  --desktop: 1024px;
  --large: 1200px;

  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 48px;

  /* Typography */
  --font-size-xs: 12px;
  --font-size-sm: 14px;
  --font-size-base: 16px;
  --font-size-lg: 18px;
  --font-size-xl: 20px;
  --font-size-2xl: 24px;
  --font-size-3xl: 32px;

  /* Touch targets */
  --touch-target: 44px;
  
  /* Colors */
  --primary: #007bff;
  --secondary: #6c757d;
  --success: #28a745;
  --danger: #dc3545;
  --warning: #ffc107;
  --info: #17a2b8;
  --light: #f8f9fa;
  --dark: #343a40;
}

/* Base styles */
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: var(--font-size-base);
  line-height: 1.5;
  color: var(--dark);
  background: var(--light);
}

/* Container system */
.container {
  width: 100%;
  max-width: var(--large);
  margin: 0 auto;
  padding: 0 var(--space-md);
}

@media (min-width: 768px) {
  .container {
    padding: 0 var(--space-lg);
  }
}

/* Grid system */
.grid {
  display: grid;
  gap: var(--space-md);
}

.grid-cols-1 { grid-template-columns: 1fr; }
.grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
.grid-cols-3 { grid-template-columns: repeat(3, 1fr); }

@media (max-width: 767px) {
  .grid-cols-2,
  .grid-cols-3 {
    grid-template-columns: 1fr;
  }
}
```

### 3.2 Mobile-First Components
```css
/* src/styles/mobile.css */

/* Touch-friendly buttons */
.btn {
  min-height: var(--touch-target);
  padding: var(--space-sm) var(--space-md);
  border: none;
  border-radius: 8px;
  font-size: var(--font-size-base);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
}

.btn:active {
  transform: scale(0.98);
}

.btn-primary {
  background: var(--primary);
  color: white;
}

.btn-primary:hover {
  background: #0056b3;
}

/* Mobile navigation */
.mobile-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  border-top: 1px solid #e9ecef;
  padding: var(--space-sm);
  display: flex;
  justify-content: space-around;
  z-index: 1000;
}

.mobile-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-sm);
  text-decoration: none;
  color: var(--secondary);
  font-size: var(--font-size-xs);
  min-width: var(--touch-target);
}

.mobile-nav-item.active {
  color: var(--primary);
}

.mobile-nav-icon {
  font-size: 20px;
  margin-bottom: 2px;
}

/* Swipe gestures */
.swipeable {
  touch-action: pan-y;
  position: relative;
  overflow: hidden;
}

.swipe-actions {
  position: absolute;
  top: 0;
  right: 0;
  height: 100%;
  display: flex;
  align-items: center;
  background: var(--danger);
  color: white;
  padding: 0 var(--space-md);
  transform: translateX(100%);
  transition: transform 0.3s ease;
}

.swipeable.swiped .swipe-actions {
  transform: translateX(0);
}

/* Pull to refresh */
.pull-to-refresh {
  position: relative;
  overflow: hidden;
}

.pull-indicator {
  position: absolute;
  top: -60px;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--primary);
  color: white;
  border-radius: 50%;
  transition: top 0.3s ease;
}

.pull-to-refresh.pulling .pull-indicator {
  top: 20px;
}

/* Mobile modal adjustments */
@media (max-width: 767px) {
  .modal-content {
    margin: 0;
    width: 100%;
    height: 100%;
    max-height: 100vh;
    border-radius: 0;
    display: flex;
    flex-direction: column;
  }

  .modal-body {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-md);
  }

  .modal-footer {
    padding: var(--space-md);
    border-top: 1px solid #e9ecef;
  }
}
```

## 4. Core Application Structure

### 4.1 Main Application Class
```javascript
// src/app.js
import { TimerManager } from './modules/timerManager.js';
import { SettingsManager } from './modules/settingsManager.js';
import { SyncManager } from './modules/syncManager.js';
import { PWAManager } from './utils/pwa.js';
import { GestureManager } from './utils/gestures.js';

export class DayWatchApp {
  constructor() {
    this.timerManager = new TimerManager();
    this.settingsManager = new SettingsManager();
    this.syncManager = new SyncManager(this.timerManager, this.settingsManager);
    this.pwaManager = new PWAManager();
    this.gestureManager = new GestureManager();
    
    this.currentView = 'timers';
    this.isOnline = navigator.onLine;
    this.isMobile = this.detectMobile();
    
    this.init();
  }

  async init() {
    try {
      // Initialize PWA features
      await this.pwaManager.init();
      
      // Set up gesture handling for mobile
      if (this.isMobile) {
        this.gestureManager.init();
        this.setupMobileFeatures();
      }
      
      // Initialize sync if authenticated
      if (this.syncManager.isAuthenticated()) {
        await this.syncManager.fullSync();
      }
      
      // Render initial view
      this.render();
      
      // Set up event listeners
      this.setupEventListeners();
      
      console.log('DayWatch Web App initialized');
    } catch (error) {
      console.error('Initialization error:', error);
      this.showError('Failed to initialize app');
    }
  }

  detectMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           window.innerWidth <= 768;
  }

  setupMobileFeatures() {
    // Add mobile navigation
    this.createMobileNavigation();
    
    // Set up pull-to-refresh
    this.setupPullToRefresh();
    
    // Configure viewport for mobile
    this.configureMobileViewport();
  }

  createMobileNavigation() {
    const nav = document.createElement('nav');
    nav.className = 'mobile-nav';
    nav.innerHTML = `
      <a href="#timers" class="mobile-nav-item active" data-view="timers">
        <span class="mobile-nav-icon">⏰</span>
        <span>Timers</span>
      </a>
      <a href="#add" class="mobile-nav-item" data-view="add">
        <span class="mobile-nav-icon">➕</span>
        <span>Add</span>
      </a>
      <a href="#sync" class="mobile-nav-item" data-view="sync">
        <span class="mobile-nav-icon">🔄</span>
        <span>Sync</span>
      </a>
      <a href="#settings" class="mobile-nav-item" data-view="settings">
        <span class="mobile-nav-icon">⚙️</span>
        <span>Settings</span>
      </a>
    `;
    
    document.body.appendChild(nav);
    
    // Add bottom padding to main content
    document.body.style.paddingBottom = '80px';
  }

  setupPullToRefresh() {
    let startY = 0;
    let currentY = 0;
    let pulling = false;
    
    const container = document.querySelector('.container');
    container.classList.add('pull-to-refresh');
    
    const indicator = document.createElement('div');
    indicator.className = 'pull-indicator';
    indicator.innerHTML = '🔄';
    container.appendChild(indicator);
    
    container.addEventListener('touchstart', (e) => {
      if (container.scrollTop === 0) {
        startY = e.touches[0].clientY;
        pulling = true;
      }
    });
    
    container.addEventListener('touchmove', (e) => {
      if (!pulling) return;
      
      currentY = e.touches[0].clientY;
      const diff = currentY - startY;
      
      if (diff > 0 && diff < 100) {
        e.preventDefault();
        container.classList.add('pulling');
      }
    });
    
    container.addEventListener('touchend', async () => {
      if (!pulling) return;
      
      const diff = currentY - startY;
      pulling = false;
      container.classList.remove('pulling');
      
      if (diff > 60) {
        await this.handleRefresh();
      }
    });
  }

  async handleRefresh() {
    try {
      if (this.syncManager.isAuthenticated()) {
        await this.syncManager.fullSync();
      }
      this.render();
      this.showNotification('Refreshed', 'success');
    } catch (error) {
      this.showNotification('Refresh failed', 'error');
    }
  }

  render() {
    const container = document.querySelector('.container');
    
    switch (this.currentView) {
      case 'timers':
        this.renderTimersView(container);
        break;
      case 'add':
        this.renderAddTimerView(container);
        break;
      case 'sync':
        this.renderSyncView(container);
        break;
      case 'settings':
        this.renderSettingsView(container);
        break;
    }
    
    this.updateNavigation();
  }

  renderTimersView(container) {
    const timers = this.timerManager.getTimers();
    
    container.innerHTML = `
      <header class="app-header">
        <h1>DayWatch</h1>
        <div class="sync-status" id="sync-status"></div>
      </header>
      
      <div class="timers-grid grid" id="timers-container">
        ${timers.map(timer => this.renderTimerCard(timer)).join('')}
      </div>
      
      ${timers.length === 0 ? `
        <div class="empty-state">
          <h2>No timers yet</h2>
          <p>Add your first countdown timer to get started</p>
          <button class="btn btn-primary" onclick="app.switchView('add')">
            Add Timer
          </button>
        </div>
      ` : ''}
    `;
    
    this.updateSyncStatus();
  }

  renderTimerCard(timer) {
    const now = new Date();
    const targetDate = new Date(timer.date);
    const diffTime = targetDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const isToday = diffDays === 0;
    const isPast = diffDays < 0;
    
    return `
      <div class="timer-card swipeable" style="border-left: 4px solid ${timer.color}" data-timer-id="${timer.id}">
        <div class="timer-content">
          <div class="timer-header">
            <span class="timer-days ${isPast ? 'past' : isToday ? 'today' : ''}">${Math.abs(diffDays)}</span>
            <span class="timer-label">${isPast ? 'days ago' : isToday ? 'today' : 'days'}</span>
          </div>
          <h3 class="timer-name">${timer.name}</h3>
          ${timer.time ? `<p class="timer-time">⏰ ${timer.time}</p>` : ''}
          ${timer.location ? `<p class="timer-location">📍 ${timer.location}</p>` : ''}
        </div>
        <div class="swipe-actions">
          <button class="btn-icon" onclick="app.editTimer('${timer.id}')">✏️</button>
          <button class="btn-icon" onclick="app.deleteTimer('${timer.id}')">🗑️</button>
        </div>
      </div>
    `;
  }

  switchView(view) {
    this.currentView = view;
    this.render();
  }

  updateNavigation() {
    const navItems = document.querySelectorAll('.mobile-nav-item');
    navItems.forEach(item => {
      item.classList.toggle('active', item.dataset.view === this.currentView);
    });
  }

  setupEventListeners() {
    // Navigation
    document.addEventListener('click', (e) => {
      if (e.target.matches('.mobile-nav-item')) {
        e.preventDefault();
        this.switchView(e.target.dataset.view);
      }
    });
    
    // Network status
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.updateSyncStatus();
      if (this.syncManager.isAuthenticated()) {
        this.syncManager.fullSync();
      }
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.updateSyncStatus();
    });
    
    // Sync events
    this.syncManager.on('sync:completed', () => {
      this.render();
      this.showNotification('Synced successfully', 'success');
    });
    
    this.syncManager.on('sync:error', (error) => {
      this.showNotification('Sync failed: ' + error.message, 'error');
    });
  }

  updateSyncStatus() {
    const statusEl = document.getElementById('sync-status');
    if (!statusEl) return;
    
    const status = this.syncManager.getSyncStatus();
    
    if (!this.isOnline) {
      statusEl.innerHTML = '⚡ Offline';
      statusEl.className = 'sync-status offline';
    } else if (!status.isAuthenticated) {
      statusEl.innerHTML = '🔒 Not synced';
      statusEl.className = 'sync-status not-authenticated';
    } else if (status.syncInProgress) {
      statusEl.innerHTML = '🔄 Syncing...';
      statusEl.className = 'sync-status syncing';
    } else {
      statusEl.innerHTML = '✅ Synced';
      statusEl.className = 'sync-status synced';
    }
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 100);
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  showError(message) {
    this.showNotification(message, 'error');
  }
}

// Global app instance
window.app = new DayWatchApp();
```

This web/mobile app specification provides:

1. **Progressive Web App** with offline capabilities and installability
2. **Mobile-first responsive design** with touch-friendly interfaces
3. **Gesture support** including swipe actions and pull-to-refresh
4. **Shared codebase** with the Chrome extension for consistency
5. **Native app-like experience** with bottom navigation and full-screen modals

The implementation ensures a seamless experience across all devices while maintaining feature parity with the Chrome extension.
