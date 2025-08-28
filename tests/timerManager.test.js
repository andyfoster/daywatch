import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TimerManager } from '../modules/timerManager.js';

describe('TimerManager', () => {
  let timerManager;

  beforeEach(() => {
    timerManager = new TimerManager();
  });

  describe('addTimer', () => {
    it('should add a valid timer', () => {
      const timer = timerManager.addTimer('Test Event', '2024-12-25', '#ff0000', true, '12:00', 'Test Location', 'https://example.com');

      expect(timer).toEqual({
        name: 'Test Event',
        date: new Date('2024-12-25').getTime(),
        color: '#ff0000',
        showOnMainScreen: true,
        time: '12:00',
        location: 'Test Location',
        link: 'https://example.com'
      });

      expect(timerManager.getTimers()).toHaveLength(1);
    });

    it('should throw error for invalid timer data', () => {
      expect(() => timerManager.addTimer('', '2024-12-25', '#ff0000')).toThrow('Invalid timer data');
      expect(() => timerManager.addTimer('Test', '', '#ff0000')).toThrow('Invalid timer data');
      expect(() => timerManager.addTimer('Test', '2024-12-25', '')).toThrow('Invalid timer data');
    });

    it('should sanitize input data', () => {
      const timer = timerManager.addTimer('<script>alert("xss")</script>', '2024-12-25', '#ff0000');
      expect(timer.name).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });

    it('should handle optional parameters', () => {
      const timer = timerManager.addTimer('Test Event', '2024-12-25', '#ff0000');

      expect(timer.showOnMainScreen).toBe(true);
      expect(timer.time).toBe(null);
      expect(timer.location).toBe(null);
      expect(timer.link).toBe(null);
    });
  });

  describe('editTimer', () => {
    beforeEach(() => {
      timerManager.addTimer('Original Event', '2024-12-25', '#ff0000', true, '12:00', 'Original Location', 'https://original.com');
    });

    it('should edit an existing timer', () => {
      const editedTimer = timerManager.editTimer(0, 'Edited Event', '2024-12-26', '#00ff00', false, '13:00', 'New Location', 'https://new.com');

      expect(editedTimer.name).toBe('Edited Event');
      expect(editedTimer.date).toBe(new Date('2024-12-26').getTime());
      expect(editedTimer.color).toBe('#00ff00');
      expect(editedTimer.showOnMainScreen).toBe(false);
      expect(editedTimer.time).toBe('13:00');
      expect(editedTimer.location).toBe('New Location');
      expect(editedTimer.link).toBe('https://new.com');
    });

    it('should throw error for invalid index', () => {
      expect(() => timerManager.editTimer(-1, 'Test', '2024-12-25', '#ff0000')).toThrow('Invalid timer index');
      expect(() => timerManager.editTimer(999, 'Test', '2024-12-25', '#ff0000')).toThrow('Invalid timer index');
    });

    it('should preserve existing values when undefined passed', () => {
      const originalTimer = timerManager.getTimers()[0];
      const editedTimer = timerManager.editTimer(0, 'New Name', '2024-12-26', '#00ff00', false, undefined, undefined, undefined);

      expect(editedTimer.time).toBe(originalTimer.time);
      expect(editedTimer.location).toBe(originalTimer.location);
      expect(editedTimer.link).toBe(originalTimer.link);
    });
  });

  describe('removeTimer', () => {
    beforeEach(() => {
      timerManager.addTimer('Timer 1', '2024-12-25', '#ff0000');
      timerManager.addTimer('Timer 2', '2024-12-26', '#00ff00');
    });

    it('should remove a timer by index', () => {
      timerManager.removeTimer(0);
      const timers = timerManager.getTimers();

      expect(timers).toHaveLength(1);
      expect(timers[0].name).toBe('Timer 2');
    });

    it('should throw error for invalid index', () => {
      expect(() => timerManager.removeTimer(-1)).toThrow('Invalid timer index');
      expect(() => timerManager.removeTimer(999)).toThrow('Invalid timer index');
    });
  });

  describe('sortTimers', () => {
    beforeEach(() => {
      // Add timers in random order
      timerManager.addTimer('Event C', '2024-12-27', '#ff0000', true, '15:00');
      timerManager.addTimer('Event A', '2024-12-25', '#00ff00', true, '10:00');
      timerManager.addTimer('Event B', '2024-12-25', '#0000ff', true, '14:00');
      timerManager.addTimer('Event D', '2024-12-25', '#ffff00', true); // No time
    });

    it('should sort timers by date first', () => {
      timerManager.sortTimers();
      const timers = timerManager.getTimers();

      expect(timers[0].name).toBe('Event A'); // 2024-12-25 10:00
      expect(timers[1].name).toBe('Event B'); // 2024-12-25 14:00
      expect(timers[2].name).toBe('Event D'); // 2024-12-25 no time
      expect(timers[3].name).toBe('Event C'); // 2024-12-27 15:00
    });

    it('should sort by time within same date', () => {
      timerManager.sortTimers();
      const timers = timerManager.getTimers();
      const sameDateTimers = timers.filter(t => new Date(t.date).toDateString() === new Date('2024-12-25').toDateString());

      expect(sameDateTimers[0].time).toBe('10:00');
      expect(sameDateTimers[1].time).toBe('14:00');
      expect(sameDateTimers[2].time).toBe(null); // No time comes last
    });
  });

  describe('exportTimers', () => {
    it('should export timers as text', () => {
      timerManager.addTimer('Test Event', '2024-12-25', '#ff0000', true, '12:00', 'Test Location', 'https://example.com');
      const exported = timerManager.exportTimers();

      expect(exported).toBe('Test Event; 2024-12-25; #ff0000; true; 12:00; Test Location; https://example.com');
    });

    it('should handle empty values in export', () => {
      timerManager.addTimer('Test Event', '2024-12-25', '#ff0000', false);
      const exported = timerManager.exportTimers();

      expect(exported).toBe('Test Event; 2024-12-25; #ff0000; false; ; ; ');
    });
  });

  describe('importTimers', () => {
    it('should import timers from text', () => {
      const importText = 'Event 1; 2024-12-25; #ff0000; true; 12:00; Location 1; https://example.com\nEvent 2; 2024-12-26; #00ff00; false; ; ; ';

      timerManager.importTimers(importText);
      const timers = timerManager.getTimers();

      expect(timers).toHaveLength(2);
      expect(timers[0].name).toBe('Event 1');
      expect(timers[1].name).toBe('Event 2');
    });

    it('should skip invalid lines during import', () => {
      const importText = 'Valid Event; 2024-12-25; #ff0000; true; ; ; \nInvalid Line\n; ; ; ; ; ; ';

      timerManager.importTimers(importText);
      const timers = timerManager.getTimers();

      expect(timers).toHaveLength(1);
      expect(timers[0].name).toBe('Valid Event');
    });
  });

  describe('sanitizeInput', () => {
    it('should sanitize HTML characters', () => {
      expect(timerManager.sanitizeInput('<script>')).toBe('&lt;script&gt;');
      expect(timerManager.sanitizeInput('Test & "quotes"')).toBe('Test &amp; &quot;quotes&quot;');
      expect(timerManager.sanitizeInput("Test 'single' quotes")).toBe('Test &#39;single&#39; quotes');
    });
  });

  describe('sanitizeColor', () => {
    it('should validate hex colors', () => {
      expect(timerManager.sanitizeColor('#ff0000')).toBe('#ff0000');
      expect(timerManager.sanitizeColor('#FF0000')).toBe('#FF0000');
      expect(timerManager.sanitizeColor('invalid')).toBe('#000000');
      expect(timerManager.sanitizeColor('#ff00')).toBe('#000000');
    });
  });
});