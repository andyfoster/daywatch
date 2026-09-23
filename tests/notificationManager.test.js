import { describe, it, expect } from 'vitest';
import { NotificationManager } from '../modules/notificationManager.js';

describe('NotificationManager', () => {
  it('should append a toast notification to the document body', () => {
    const manager = new NotificationManager();
    manager.show('Hello', 'success');

    const notification = document.body.querySelector('.notification.success');
    expect(notification).not.toBeNull();
    expect(notification.textContent).toBe('Hello');
  });

  it('should default to the info type when none is given', () => {
    const manager = new NotificationManager();
    manager.show('Just FYI');

    expect(document.body.querySelector('.notification.info')).not.toBeNull();
  });

  it('should log and alert on error', () => {
    const manager = new NotificationManager();

    manager.error('Something broke');

    expect(console.error).toHaveBeenCalledWith('Something broke');
    expect(alert).toHaveBeenCalledWith('Something broke');
  });
});
