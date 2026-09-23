import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TimerRenderer } from '../modules/timerRenderer.js';

describe('TimerRenderer', () => {
  let timerRenderer;
  let mockTimerManager;
  let mockSettingsManager;
  let onEditTimer;
  let onAddTimer;

  const translations = {
    en: { today: 'Today', day: 'day', days: 'days' }
  };

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="timers-container"></div>
      <ul id="events-list"></ul>
    `;

    mockTimerManager = {
      getTimers: vi.fn().mockReturnValue([]),
      setTimerVisibility: vi.fn()
    };

    mockSettingsManager = {
      getCurrentSettings: vi.fn().mockReturnValue({ displayFont: 'Arial', language: 'en' }),
      formatDate: vi.fn().mockReturnValue('Dec 25, 2024')
    };

    onEditTimer = vi.fn();
    onAddTimer = vi.fn();

    timerRenderer = new TimerRenderer(mockTimerManager, mockSettingsManager, translations, {
      onEditTimer,
      onAddTimer
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
      const createTimerElementSpy = vi.spyOn(timerRenderer, 'createTimerElement').mockImplementation(() => {});

      timerRenderer.renderMainTimers();

      expect(createTimerElementSpy).toHaveBeenCalledTimes(2); // Only events 1 and 3
      expect(createTimerElementSpy).toHaveBeenCalledWith(mockTimers[0], 0);
      expect(createTimerElementSpy).toHaveBeenCalledWith(mockTimers[2], 2);
    });

    it('should clear container before rendering', () => {
      timerRenderer.timersContainer.innerHTML = '<div class="existing-content">existing content</div>';

      timerRenderer.renderMainTimers();

      expect(timerRenderer.timersContainer.querySelector('.existing-content')).toBeNull();
    });

    it('should append an add-timer placeholder card', () => {
      timerRenderer.renderMainTimers();

      const placeholder = timerRenderer.timersContainer.querySelector('.add-timer-placeholder');
      expect(placeholder).not.toBeNull();
      expect(placeholder).toBe(timerRenderer.timersContainer.lastElementChild);
    });

    it('should invoke onAddTimer when the placeholder is clicked', () => {
      timerRenderer.renderMainTimers();
      timerRenderer.timersContainer.querySelector('.add-timer-placeholder').click();

      expect(onAddTimer).toHaveBeenCalled();
    });
  });

  describe('createTimerElement', () => {
    it('should render a full timer card into the container', () => {
      const timer = {
        name: 'Test Event',
        date: Date.now() + 86400000,
        color: '#ff0000',
        location: null,
        link: null
      };

      timerRenderer.createTimerElement(timer, 0);

      const card = timerRenderer.timersContainer.querySelector('.timer');
      expect(card).not.toBeNull();
      expect(card.querySelector('.due-date').textContent).toBe('Test Event');
    });

    it('should invoke onEditTimer when the edit button is clicked', () => {
      const timer = { name: 'Test Event', date: Date.now(), color: '#ff0000' };

      timerRenderer.createTimerElement(timer, 3);
      timerRenderer.timersContainer.querySelector('.edit-btn').click();

      expect(onEditTimer).toHaveBeenCalledWith(3);
    });
  });

  describe('calculateWeekdaysDifference', () => {
    it('should return 0 for the same date', () => {
      const date = new Date('2024-01-01');
      expect(timerRenderer.calculateWeekdaysDifference(date, date)).toBe(0);
    });
  });

  describe('renderSidebarEvents', () => {
    it('should render one list item per timer and toggle visibility on checkbox change', () => {
      const timer = { name: 'Sidebar Event', date: Date.now(), color: '#ff0000', showOnMainScreen: true };
      mockTimerManager.getTimers.mockReturnValue([timer]);

      timerRenderer.renderSidebarEvents();

      const checkbox = timerRenderer.eventsList.querySelector('.sidebar-visibility-checkbox');
      expect(checkbox).not.toBeNull();

      checkbox.checked = false;
      checkbox.dispatchEvent(new Event('change'));

      expect(mockTimerManager.setTimerVisibility).toHaveBeenCalledWith(0, false);
    });
  });
});
