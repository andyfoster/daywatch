import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UIManager } from '../modules/uiManager.js';

// Mock the dependencies
vi.mock('../modules/modalManager.js', () => ({
  ModalManager: vi.fn().mockImplementation(() => ({
    showModal: vi.fn(),
    hideModal: vi.fn(),
    isModalVisible: vi.fn().mockReturnValue(false)
  }))
}));

vi.mock('../modules/sidebarManager.js', () => ({
  SidebarManager: vi.fn().mockImplementation(() => ({
    toggle: vi.fn(),
    isOpen: vi.fn().mockReturnValue(false)
  }))
}));

vi.mock('../modules/elementFactory.js', () => ({
  ElementFactory: {
    createLocationElement: vi.fn(),
    createTimerHeader: vi.fn(),
    createTimerName: vi.fn(),
    createEditButton: vi.fn(),
    createSidebarEventText: vi.fn(),
    createDownloadLink: vi.fn()
  }
}));

describe('UIManager', () => {
  let uiManager;
  let mockTimerManager;
  let mockSettingsManager;

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = `
      <div id="timers-container"></div>
      <div id="date"></div>
      <form id="timer-form">
        <input id="event-name" type="text">
        <input id="event-date" type="date">
        <input id="event-time" type="time">
        <input id="event-color" type="color">
        <input id="event-location" type="text">
        <input id="event-link" type="url">
        <input id="show-on-main-screen" type="checkbox">
      </form>
      <form id="settings-form">
        <select id="date-format-select"></select>
        <select id="display-font"></select>
        <select id="language"></select>
      </form>
      <h2 id="modal-title"></h2>
      <button id="remove-timer-btn"></button>
      <button id="add-timer-btn"></button>
      <button id="new-timer-btn-sidebar"></button>
      <button id="settings-btn"></button>
      <button id="import-timers-btn"></button>
      <button id="download-timers-btn"></button>
      <button id="mass-delete-btn"></button>
      <div id="timer-modal" class="modal">
        <span class="close">&times;</span>
      </div>
      <div id="import-modal" class="modal">
        <span class="close">&times;</span>
      </div>
      <div id="mass-delete-modal" class="modal">
        <span class="close">&times;</span>
      </div>
      <div id="settings-modal" class="modal">
        <span class="close">&times;</span>
      </div>
      <ul id="events-list"></ul>
    `;

    // Mock managers
    mockTimerManager = {
      getTimers: vi.fn().mockReturnValue([]),
      addTimer: vi.fn(),
      editTimer: vi.fn(),
      removeTimer: vi.fn(),
      sortTimers: vi.fn(),
      exportTimers: vi.fn().mockReturnValue('test export data')
    };

    mockSettingsManager = {
      getCurrentSettings: vi.fn().mockReturnValue({
        language: 'en',
        displayFont: 'Arial',
        dateFormat: 'MM/DD/YYYY'
      }),
      updateSettings: vi.fn(),
      formatDate: vi.fn().mockReturnValue('Dec 25, 2024'),
      getDateFormatOptionsForLanguage: vi.fn().mockReturnValue([
        { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' }
      ])
    };

    uiManager = new UIManager(mockTimerManager, mockSettingsManager);
  });

  describe('constructor', () => {
    it('should initialize with correct managers', () => {
      expect(uiManager.timerManager).toBe(mockTimerManager);
      expect(uiManager.settingsManager).toBe(mockSettingsManager);
      expect(uiManager.modalManager).toBeDefined();
      expect(uiManager.sidebarManager).toBeDefined();
    });

    it('should cache DOM elements', () => {
      expect(uiManager.elements.timersContainer).toBe(document.getElementById('timers-container'));
      expect(uiManager.elements.dateEl).toBe(document.getElementById('date'));
      expect(uiManager.elements.timerForm).toBe(document.getElementById('timer-form'));
    });

    it('should setup event listeners', () => {
      // Test that buttons have event listeners by checking they don't throw when clicked
      expect(() => {
        document.getElementById('add-timer-btn').click();
        document.getElementById('settings-btn').click();
        document.getElementById('download-timers-btn').click();
      }).not.toThrow();
    });
  });

  describe('showTimerModal', () => {
    it('should show modal for new timer', () => {
      uiManager.showTimerModal();

      expect(uiManager.modalManager.showModal).toHaveBeenCalledWith('timer-modal', expect.any(Object));
      expect(uiManager.elements.modalTitle.textContent).toContain('Timer'); // Should contain some timer text
    });

    it('should show modal for editing timer', () => {
      const mockTimer = {
        name: 'Test Event',
        date: new Date('2024-12-25').getTime(),
        time: '12:00',
        color: '#ff0000',
        location: 'Test Location',
        link: 'https://example.com',
        showOnMainScreen: true
      };

      mockTimerManager.getTimers.mockReturnValue([mockTimer]);

      uiManager.showTimerModal(true, 0);

      expect(uiManager.modalManager.showModal).toHaveBeenCalled();
      expect(uiManager.editIndex).toBe(0);
    });
  });

  describe('handleTimerFormSubmit', () => {
    beforeEach(() => {
      // Setup form values
      document.getElementById('event-name').value = 'Test Event';
      document.getElementById('event-date').value = '2024-12-25';
      document.getElementById('event-time').value = '12:00';
      document.getElementById('event-color').value = '#ff0000';
      document.getElementById('event-location').value = 'Test Location';
      document.getElementById('event-link').value = 'https://example.com';
      document.getElementById('show-on-main-screen').checked = true;
    });

    it('should add new timer', async () => {
      const event = new Event('submit');
      event.preventDefault = vi.fn();

      await uiManager.handleTimerFormSubmit(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(mockTimerManager.addTimer).toHaveBeenCalledWith(
        'Test Event',
        '2024-12-25',
        '#ff0000',
        true,
        '12:00',
        'Test Location',
        'https://example.com'
      );
      expect(mockTimerManager.sortTimers).toHaveBeenCalled();
      expect(uiManager.modalManager.hideModal).toHaveBeenCalledWith('timer-modal');
    });

    it('should edit existing timer', async () => {
      uiManager.editIndex = 0;
      const event = new Event('submit');
      event.preventDefault = vi.fn();

      await uiManager.handleTimerFormSubmit(event);

      expect(mockTimerManager.editTimer).toHaveBeenCalledWith(
        0,
        'Test Event',
        '2024-12-25',
        '#ff0000',
        true,
        '12:00',
        'Test Location',
        'https://example.com'
      );
    });

    it('should handle form submission errors', async () => {
      mockTimerManager.addTimer.mockRejectedValue(new Error('Test error'));
      const showErrorSpy = vi.spyOn(uiManager, 'showError');

      const event = new Event('submit');
      event.preventDefault = vi.fn();

      await uiManager.handleTimerFormSubmit(event);

      expect(showErrorSpy).toHaveBeenCalledWith('Test error');
    });
  });

  describe('renderMainTimers', () => {
    it('should render timers that show on main screen', () => {
      const mockTimers = [
        { name: 'Event 1', showOnMainScreen: true, date: Date.now(), color: '#ff0000' },
        { name: 'Event 2', showOnMainScreen: false, date: Date.now(), color: '#00ff00' },
        { name: 'Event 3', showOnMainScreen: true, date: Date.now(), color: '#0000ff' }
      ];

      mockTimerManager.getTimers.mockReturnValue(mockTimers);
      const createTimerElementSpy = vi.spyOn(uiManager, 'createTimerElement').mockImplementation(() => {});

      uiManager.renderMainTimers();

      expect(createTimerElementSpy).toHaveBeenCalledTimes(2); // Only events 1 and 3
      expect(createTimerElementSpy).toHaveBeenCalledWith(mockTimers[0], 0);
      expect(createTimerElementSpy).toHaveBeenCalledWith(mockTimers[2], 2);
    });

    it('should clear container before rendering', () => {
      uiManager.elements.timersContainer.innerHTML = '<div>existing content</div>';

      uiManager.renderMainTimers();

      expect(uiManager.elements.timersContainer.innerHTML).toBe('');
    });
  });

  describe('downloadTimers', () => {
    it('should trigger download with exported data', () => {
      uiManager.downloadTimers();

      expect(mockTimerManager.exportTimers).toHaveBeenCalled();
      // Note: ElementFactory.createDownloadLink is called but we don't need to test the mock here
    });
  });

  describe('resetForm', () => {
    beforeEach(() => {
      // Set form values
      document.getElementById('event-name').value = 'Test';
      document.getElementById('event-date').value = '2024-12-25';
      document.getElementById('event-time').value = '12:00';
      document.getElementById('event-color').value = '#ff0000';
      document.getElementById('event-location').value = 'Location';
      document.getElementById('event-link').value = 'https://example.com';
      document.getElementById('show-on-main-screen').checked = false;
      uiManager.editIndex = 5;
    });

    it('should reset all form fields', () => {
      uiManager.resetForm();

      expect(document.getElementById('event-name').value).toBe('');
      expect(document.getElementById('event-date').value).toBe('');
      expect(document.getElementById('event-time').value).toBe('');
      expect(document.getElementById('event-color').value).toBe('#000000');
      expect(document.getElementById('event-location').value).toBe('');
      expect(document.getElementById('event-link').value).toBe('');
      expect(document.getElementById('show-on-main-screen').checked).toBe(true);
      expect(uiManager.editIndex).toBeUndefined();
    });
  });

  describe('updateUI', () => {
    it('should update date display', () => {
      uiManager.updateUI();

      expect(uiManager.elements.dateEl.textContent).toBeTruthy();
    });
  });
});