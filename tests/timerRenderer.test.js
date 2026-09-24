import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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

    it('should invoke onEditTimer when the edit icon button is clicked', () => {
      const timer = { name: 'Test Event', date: Date.now(), color: '#ff0000' };

      timerRenderer.createTimerElement(timer, 3);
      timerRenderer.timersContainer.querySelector('.timer-edit-btn').click();

      expect(onEditTimer).toHaveBeenCalledWith(3);
    });

    it('should not open the edit modal when the date label is clicked', () => {
      const timer = { name: 'Test Event', date: Date.now(), color: '#ff0000' };

      timerRenderer.createTimerElement(timer, 3);
      const dateLabel = timerRenderer.timersContainer.querySelector('.timer-date-label');

      expect(dateLabel).not.toBeNull();
      expect(dateLabel.tagName).not.toBe('BUTTON');

      dateLabel.click();

      expect(onEditTimer).not.toHaveBeenCalled();
    });

    it('should hide the timer from the main screen when the hide button is clicked, without opening the edit modal', () => {
      const timer = { name: 'Test Event', date: Date.now(), color: '#ff0000', showOnMainScreen: true };
      mockTimerManager.getTimers.mockReturnValue([timer]);

      timerRenderer.createTimerElement(timer, 2);
      timerRenderer.timersContainer.querySelector('.timer-hide-btn').click();

      expect(mockTimerManager.setTimerVisibility).toHaveBeenCalledWith(2, false);
      expect(onEditTimer).not.toHaveBeenCalled();
    });
  });

  describe('event countdown', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-06-15T10:00:00'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should render a ticking countdown when the event is today and has a time', () => {
      const todayMidnight = new Date('2024-06-15T00:00:00').getTime();
      const timer = { name: 'Standup', date: todayMidnight, time: '12:00', color: '#ff0000' };

      timerRenderer.createTimerElement(timer, 0);

      const countdownEl = timerRenderer.timersContainer.querySelector('.event-countdown');
      expect(countdownEl).not.toBeNull();
      expect(countdownEl.textContent).toBe('02:00:00');

      vi.advanceTimersByTime(1000);
      expect(countdownEl.textContent).toBe('01:59:59');
    });

    it('should remove the countdown element once it reaches zero, instead of showing 00:00:00', () => {
      const todayMidnight = new Date('2024-06-15T00:00:00').getTime();
      // Target time is 2 seconds away from the faked "now" of 10:00:00
      const timer = { name: 'Standup', date: todayMidnight, time: '10:00', color: '#ff0000' };
      vi.setSystemTime(new Date('2024-06-15T09:59:58'));

      timerRenderer.createTimerElement(timer, 0);
      expect(timerRenderer.timersContainer.querySelector('.event-countdown')).not.toBeNull();

      vi.advanceTimersByTime(2000);

      expect(timerRenderer.timersContainer.querySelector('.event-countdown')).toBeNull();
    });

    it('should not render a countdown when the event is today but has no time', () => {
      const todayMidnight = new Date('2024-06-15T00:00:00').getTime();
      const timer = { name: 'All-day event', date: todayMidnight, time: null, color: '#ff0000' };

      timerRenderer.createTimerElement(timer, 0);

      expect(timerRenderer.timersContainer.querySelector('.event-countdown')).toBeNull();
    });

    it('should not render a countdown when the event time has already passed today', () => {
      const todayMidnight = new Date('2024-06-15T00:00:00').getTime();
      const timer = { name: 'Standup', date: todayMidnight, time: '09:00', color: '#ff0000' };

      timerRenderer.createTimerElement(timer, 0);

      expect(timerRenderer.timersContainer.querySelector('.event-countdown')).toBeNull();
    });

    it('should not render a countdown when the event is not today, even with a time set', () => {
      const tomorrow = new Date('2024-06-16T00:00:00').getTime();
      const timer = { name: 'Standup', date: tomorrow, time: '12:00', color: '#ff0000' };

      timerRenderer.createTimerElement(timer, 0);

      expect(timerRenderer.timersContainer.querySelector('.event-countdown')).toBeNull();
    });

    it('should clear previous countdown intervals on re-render instead of accumulating them', () => {
      const todayMidnight = new Date('2024-06-15T00:00:00').getTime();
      mockTimerManager.getTimers.mockReturnValue([
        { name: 'Standup', date: todayMidnight, time: '12:00', color: '#ff0000', showOnMainScreen: true }
      ]);

      timerRenderer.renderMainTimers();
      expect(timerRenderer.countdownIntervals.length).toBe(1);

      timerRenderer.renderMainTimers();
      expect(timerRenderer.countdownIntervals.length).toBe(1);
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
