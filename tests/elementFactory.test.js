import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ElementFactory } from '../modules/elementFactory.js';

describe('ElementFactory', () => {
  const mockTimer = {
    name: 'Test Event',
    date: new Date('2024-12-25').getTime(),
    color: '#ff0000',
    time: '12:00',
    location: 'Test Location',
    link: 'https://example.com'
  };

  const mockTranslations = {
    en: {
      today: 'Today',
      day: 'day',
      days: 'days'
    }
  };

  describe('createLocationElement', () => {
    it('should return null when timer has no location', () => {
      const timerWithoutLocation = { ...mockTimer, location: null };
      const element = ElementFactory.createLocationElement(timerWithoutLocation);

      expect(element).toBe(null);
    });

    it('should create location element with text only', () => {
      const timerWithoutLink = { ...mockTimer, link: null };
      const element = ElementFactory.createLocationElement(timerWithoutLink);

      expect(element.tagName).toBe('P');
      expect(element.className).toBe('timer-location');
      expect(element.style.color).toBe('#ff0000');
      expect(element.textContent).toBe('Test Location');
    });

    it('should create location element with link', () => {
      const element = ElementFactory.createLocationElement(mockTimer);

      expect(element.tagName).toBe('P');
      expect(element.className).toBe('timer-location');

      const link = element.querySelector('a');
      expect(link).toBeTruthy();
      expect(link.href).toBe('https://example.com');
      expect(link.textContent).toBe('Test Location');
      expect(link.target).toBe('_blank');
      expect(link.rel).toBe('noopener noreferrer');
    });

    it('should use custom className when provided', () => {
      const element = ElementFactory.createLocationElement(mockTimer, 'custom-class');

      expect(element.className).toBe('custom-class');
    });
  });

  describe('createLinkElement', () => {
    it('should return null when timer has no link', () => {
      const timerWithoutLink = { ...mockTimer, link: null };
      const element = ElementFactory.createLinkElement(timerWithoutLink);

      expect(element).toBe(null);
    });

    it('should return null when timer has both location and link', () => {
      const element = ElementFactory.createLinkElement(mockTimer);

      expect(element).toBe(null); // Should not show link icon when location exists
    });

    it('should create link element when link exists but no location', () => {
      const timerWithLinkOnly = { ...mockTimer, location: null };
      const element = ElementFactory.createLinkElement(timerWithLinkOnly);

      expect(element.tagName).toBe('P');
      expect(element.className).toBe('timer-link');
      expect(element.style.color).toBe('#ff0000');

      const link = element.querySelector('a');
      expect(link).toBeTruthy();
      expect(link.href).toBe('https://example.com');
      expect(link.textContent).toBe('Open link');
      expect(link.target).toBe('_blank');
      expect(link.rel).toBe('noopener noreferrer');
      expect(link.title).toBe('https://example.com');
    });

    it('should use custom className when provided', () => {
      const timerWithLinkOnly = { ...mockTimer, location: null };
      const element = ElementFactory.createLinkElement(timerWithLinkOnly, 'custom-link-class');

      expect(element.className).toBe('custom-link-class');
    });
  });

  describe('createTimerHeader', () => {
    it('should create today header', () => {
      const element = ElementFactory.createTimerHeader(true, 0, mockTranslations, 'en');

      expect(element.tagName).toBe('H2');
      expect(element.className).toBe('today');
      expect(element.textContent).toBe('Today');
    });

    it('should create days remaining header with singular day', () => {
      const element = ElementFactory.createTimerHeader(false, 1, mockTranslations, 'en');

      expect(element.tagName).toBe('H2');
      expect(element.className).toBe('days-remaining');
      expect(element.textContent).toBe('1day');

      const daysLabel = element.querySelector('.days-label');
      expect(daysLabel.textContent).toBe('day');
    });

    it('should create days remaining header with plural days', () => {
      const element = ElementFactory.createTimerHeader(false, 5, mockTranslations, 'en');

      expect(element.textContent).toBe('5days');

      const daysLabel = element.querySelector('.days-label');
      expect(daysLabel.textContent).toBe('days');
    });

    it('should handle negative days (past events)', () => {
      const element = ElementFactory.createTimerHeader(false, -3, mockTranslations, 'en');

      expect(element.textContent).toBe('-3days');

      const daysLabel = element.querySelector('.days-label');
      expect(daysLabel.textContent).toBe('days'); // Math.abs(-3) = 3, so plural
    });
  });

  describe('formatCountdown', () => {
    it('should format seconds as HH:MM:SS', () => {
      expect(ElementFactory.formatCountdown(3661)).toBe('01:01:01');
    });

    it('should zero-pad each unit', () => {
      expect(ElementFactory.formatCountdown(5)).toBe('00:00:05');
    });

    it('should clamp negative values to zero', () => {
      expect(ElementFactory.formatCountdown(-42)).toBe('00:00:00');
    });
  });

  describe('calculateSecondsRemainingToday', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-06-15T10:00:00'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return 0 when no time is given', () => {
      expect(ElementFactory.calculateSecondsRemainingToday(null)).toBe(0);
    });

    it('should return seconds remaining until a later time today', () => {
      expect(ElementFactory.calculateSecondsRemainingToday('12:00')).toBe(2 * 60 * 60);
    });

    it('should return 0 when the time has already passed today', () => {
      expect(ElementFactory.calculateSecondsRemainingToday('09:00')).toBe(0);
    });
  });

  describe('createEventCountdown', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-06-15T10:00:00'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return null when the timer has no time set', () => {
      expect(ElementFactory.createEventCountdown({ ...mockTimer, time: null })).toBe(null);
    });

    it('should return null when the time has already passed today', () => {
      expect(ElementFactory.createEventCountdown({ ...mockTimer, time: '09:00' })).toBe(null);
    });

    it('should create a countdown element showing time remaining', () => {
      const element = ElementFactory.createEventCountdown({ ...mockTimer, time: '12:00' });

      expect(element.tagName).toBe('P');
      expect(element.className).toBe('event-countdown');
      expect(element.textContent).toBe('02:00:00');
    });
  });

  describe('createTimerName', () => {
    it('should create timer name element', () => {
      const element = ElementFactory.createTimerName(mockTimer);

      expect(element.tagName).toBe('P');
      expect(element.className).toBe('due-date');
      expect(element.style.color).toBe('#ff0000');
      expect(element.textContent).toBe('Test Event');
    });
  });

  describe('createDateDisplay', () => {
    let mockSettingsManager;

    beforeEach(() => {
      mockSettingsManager = {
        formatDate: vi.fn().mockReturnValue('Dec 25, 2024')
      };
    });

    it('should display the date only when no time is set', () => {
      const timerWithoutTime = { ...mockTimer, time: null };
      const element = ElementFactory.createDateDisplay(timerWithoutTime, mockSettingsManager);

      expect(element.tagName).toBe('P');
      expect(element.className).toBe('timer-date-label');
      expect(element.textContent).toBe('Dec 25, 2024');
      expect(mockSettingsManager.formatDate).toHaveBeenCalledWith(mockTimer.date);
    });

    it('should display the date and time when a time is set', () => {
      const element = ElementFactory.createDateDisplay(mockTimer, mockSettingsManager);

      expect(element.textContent).toBe('Dec 25, 2024 12:00');
    });

    it('should not be a button and should have no click behavior', () => {
      const element = ElementFactory.createDateDisplay(mockTimer, mockSettingsManager);

      expect(element.tagName).not.toBe('BUTTON');
      expect(element.onclick).toBeNull();
    });
  });

  describe('createEditIconButton', () => {
    it('should create a labeled edit button', () => {
      const element = ElementFactory.createEditIconButton(mockTimer, 2, vi.fn());

      expect(element.tagName).toBe('BUTTON');
      expect(element.className).toBe('timer-edit-btn');
      expect(element.getAttribute('aria-label')).toBe('Edit Test Event');
      expect(element.querySelector('svg.action-icon')).not.toBeNull();
    });

    it('should call the click handler with the timer index and not bubble the click', () => {
      const onClickHandler = vi.fn();
      const element = ElementFactory.createEditIconButton(mockTimer, 4, onClickHandler);

      const parent = document.createElement('div');
      const parentClickHandler = vi.fn();
      parent.addEventListener('click', parentClickHandler);
      parent.appendChild(element);

      element.click();

      expect(onClickHandler).toHaveBeenCalledWith(4);
      expect(parentClickHandler).not.toHaveBeenCalled();
    });
  });

  describe('createHideButton', () => {
    it('should create a labeled hide button', () => {
      const element = ElementFactory.createHideButton(mockTimer, 2, vi.fn());

      expect(element.tagName).toBe('BUTTON');
      expect(element.className).toBe('timer-hide-btn');
      expect(element.getAttribute('aria-label')).toBe('Hide Test Event from main screen');
      expect(element.querySelector('svg.action-icon')).not.toBeNull();
    });

    it('should call the click handler with the timer index and not bubble the click', () => {
      const onClickHandler = vi.fn();
      const element = ElementFactory.createHideButton(mockTimer, 3, onClickHandler);

      const parent = document.createElement('div');
      const parentClickHandler = vi.fn();
      parent.addEventListener('click', parentClickHandler);
      parent.appendChild(element);

      element.click();

      expect(onClickHandler).toHaveBeenCalledWith(3);
      expect(parentClickHandler).not.toHaveBeenCalled();
    });
  });

  describe('createSidebarEventText', () => {
    beforeEach(() => {
      // Mock current date to make days calculation predictable
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-12-20')); // 5 days before the event
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should create sidebar event text without time', () => {
      const timerWithoutTime = { ...mockTimer, time: null };
      const element = ElementFactory.createSidebarEventText(timerWithoutTime);

      expect(element.tagName).toBe('DIV');
      expect(element.className).toBe('sidebar-event-details');
      expect(element.querySelector('.sidebar-event-name').textContent).toBe('Test Event');
      expect(element.querySelector('.sidebar-days-remaining').textContent).toBe('5 days left');
      expect(element.querySelector('.sidebar-event-date').textContent).toBeTruthy();
      expect(element.querySelector('.sidebar-event-time')).toBe(null);
    });

    it('should create sidebar event text with time', () => {
      const element = ElementFactory.createSidebarEventText(mockTimer);

      expect(element.querySelector('.sidebar-event-time').textContent).toBe('12:00');
    });
  });

  describe('createDownloadLink', () => {
    let mockElement;
    let mockURL;

    beforeEach(() => {
      mockElement = {
        href: '',
        download: '',
        click: vi.fn(),
        remove: vi.fn()
      };

      vi.spyOn(document, 'createElement').mockReturnValue(mockElement);
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => {});
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => {});

      mockURL = {
        createObjectURL: vi.fn().mockReturnValue('blob:test-url'),
        revokeObjectURL: vi.fn()
      };
      global.URL = mockURL;
      global.Blob = vi.fn().mockImplementation((content, options) => ({ content, options }));
    });

    it('should create and trigger download', () => {
      ElementFactory.createDownloadLink('test.txt', 'test content');

      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(global.Blob).toHaveBeenCalledWith(['test content'], { type: 'text/plain' });
      expect(mockURL.createObjectURL).toHaveBeenCalled();
      expect(mockElement.href).toBe('blob:test-url');
      expect(mockElement.download).toBe('test.txt');
      expect(document.body.appendChild).toHaveBeenCalledWith(mockElement);
      expect(mockElement.click).toHaveBeenCalled();
      expect(document.body.removeChild).toHaveBeenCalledWith(mockElement);
      expect(mockURL.revokeObjectURL).toHaveBeenCalledWith('blob:test-url');
    });
  });
});
