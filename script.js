"use strict";

import { TimerManager } from './modules/timerManager.js';
import { SettingsManager } from './modules/settingsManager.js';
import { UIManager } from './modules/uiManager.js';

class DayWatch {
  constructor() {
    // Initialize managers
    this.timerManager = new TimerManager();
    this.settingsManager = new SettingsManager();
    this.uiManager = new UIManager(this.timerManager, this.settingsManager);

    // Initialize application
    this.init();
  }

  init() {
    try {
      // Sort timers on load
      this.timerManager.sortTimers();

      // Render initial UI
      this.uiManager.renderTimers();
      this.uiManager.updateUI();
      this.uiManager.populateDateFormatOptions();

      // Set up error handling
      window.addEventListener('error', this.handleError.bind(this));
      window.addEventListener('unhandledrejection', this.handlePromiseError.bind(this));

      console.log('DayWatch initialized successfully');
    } catch (error) {
      console.error('Initialization error:', error);
      this.handleError(error);
    }
  }

  handleError(error) {
    console.error('Application error:', error);
    // Implement proper error handling/reporting
  }

  handlePromiseError(event) {
    console.error('Unhandled promise rejection:', event.reason);
    // Implement proper error handling/reporting
  }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new DayWatch();
});
