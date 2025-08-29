import { describe, it, expect, beforeEach, vi } from 'vitest';
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
      expect(link.innerHTML).toBe('🔗');
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

  describe('createTimerName', () => {
    it('should create timer name element', () => {
      const element = ElementFactory.createTimerName(mockTimer);

      expect(element.tagName).toBe('P');
      expect(element.className).toBe('due-date');
      expect(element.style.color).toBe('#ff0000');
      expect(element.textContent).toBe('Test Event');
    });
  });

  describe('createEditButton', () => {
    let mockSettingsManager;
    let mockClickHandler;

    beforeEach(() => {
      mockSettingsManager = {
        formatDate: vi.fn().mockReturnValue('Dec 25, 2024')
      };
      mockClickHandler = vi.fn();
    });

    it('should create edit button with date only', () => {
      const timerWithoutTime = { ...mockTimer, time: null };
      const element = ElementFactory.createEditButton(timerWithoutTime, 0, mockClickHandler, mockSettingsManager);

      expect(element.tagName).toBe('BUTTON');
      expect(element.className).toBe('edit-btn');
      expect(element.textContent).toBe('Dec 25, 2024');
      expect(mockSettingsManager.formatDate).toHaveBeenCalledWith(mockTimer.date);
    });

    it('should create edit button with date and time', () => {
      const element = ElementFactory.createEditButton(mockTimer, 0, mockClickHandler, mockSettingsManager);

      expect(element.textContent).toBe('Dec 25, 2024 12:00');
    });

    it('should call click handler when clicked', () => {
      const element = ElementFactory.createEditButton(mockTimer, 5, mockClickHandler, mockSettingsManager);

      element.click();

      expect(mockClickHandler).toHaveBeenCalledWith(true, 5);
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

      expect(element.tagName).toBe('SPAN');
      expect(element.textContent).toBe('Test Event - 5 days');
    });

    it('should create sidebar event text with time', () => {
      const element = ElementFactory.createSidebarEventText(mockTimer);

      expect(element.textContent).toBe('Test Event - 5 days (12:00)');
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