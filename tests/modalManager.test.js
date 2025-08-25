import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ModalManager } from '../modules/modalManager.js';

describe('ModalManager', () => {
  let modalManager;
  let mockOverlay;
  let mockModal;
  let mockSidePanel;

  beforeEach(() => {
    // Setup DOM elements
    document.body.innerHTML = `
      <div id="overlay"></div>
      <div id="test-modal" class="modal">
        <input type="text" id="test-input">
        <button id="test-button">Test</button>
      </div>
      <div id="events-side-panel"></div>
    `;

    mockOverlay = document.getElementById('overlay');
    mockModal = document.getElementById('test-modal');
    mockSidePanel = document.getElementById('events-side-panel');

    modalManager = new ModalManager();
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      expect(modalManager.activeModal).toBe(null);
      expect(modalManager.overlay).toBe(mockOverlay);
    });

    it('should setup overlay click handler', () => {
      const clickEvent = new Event('click');
      mockOverlay.dispatchEvent(clickEvent);
      // Should not throw error
    });
  });

  describe('showModal', () => {
    it('should show modal with correct classes', () => {
      modalManager.showModal('test-modal');

      expect(mockModal.classList.contains('modal-visible')).toBe(true);
      expect(mockOverlay.classList.contains('overlay-visible')).toBe(true);
      expect(modalManager.activeModal).toBe(mockModal);
    });

    it('should focus first input element', () => {
      const focusSpy = vi.spyOn(document.getElementById('test-input'), 'focus');

      modalManager.showModal('test-modal');

      expect(focusSpy).toHaveBeenCalled();
    });

    it('should run setup function if provided', () => {
      const setupSpy = vi.fn();

      modalManager.showModal('test-modal', { setup: setupSpy });

      expect(setupSpy).toHaveBeenCalledWith(mockModal);
    });

    it('should hide previous modal before showing new one', () => {
      // Show first modal
      modalManager.showModal('test-modal');
      expect(modalManager.activeModal).toBe(mockModal);

      // Add second modal
      document.body.innerHTML += '<div id="second-modal" class="modal"></div>';
      const secondModal = document.getElementById('second-modal');

      // Show second modal
      modalManager.showModal('second-modal');

      expect(mockModal.classList.contains('modal-visible')).toBe(false);
      expect(secondModal.classList.contains('modal-visible')).toBe(true);
      expect(modalManager.activeModal).toBe(secondModal);
    });

    it('should log error for non-existent modal', () => {
      const consoleSpy = vi.spyOn(console, 'error');

      modalManager.showModal('non-existent-modal');

      expect(consoleSpy).toHaveBeenCalledWith('Modal with id "non-existent-modal" not found');
    });
  });

  describe('hideActiveModal', () => {
    beforeEach(() => {
      modalManager.showModal('test-modal');
    });

    it('should hide active modal', () => {
      modalManager.hideActiveModal();

      expect(mockModal.classList.contains('modal-visible')).toBe(false);
      expect(modalManager.activeModal).toBe(null);
    });

    it('should hide overlay when no sidebar is visible', () => {
      modalManager.hideActiveModal();

      expect(mockOverlay.classList.contains('overlay-visible')).toBe(false);
    });

    it('should keep overlay visible when sidebar is visible', () => {
      mockSidePanel.classList.add('visible');

      modalManager.hideActiveModal();

      expect(mockOverlay.classList.contains('overlay-visible')).toBe(true);
    });

    it('should do nothing if no active modal', () => {
      modalManager.hideActiveModal(); // Hide first time
      modalManager.hideActiveModal(); // Should not throw error

      expect(modalManager.activeModal).toBe(null);
    });
  });

  describe('hideModal', () => {
    beforeEach(() => {
      modalManager.showModal('test-modal');
    });

    it('should hide specific modal by id', () => {
      modalManager.hideModal('test-modal');

      expect(mockModal.classList.contains('modal-visible')).toBe(false);
      expect(modalManager.activeModal).toBe(null);
    });

    it('should handle non-existent modal id gracefully', () => {
      modalManager.hideModal('non-existent');

      // Should not throw error and active modal should remain
      expect(modalManager.activeModal).toBe(mockModal);
    });

    it('should only clear activeModal if hiding the active one', () => {
      // Add second modal but don't make it active
      document.body.innerHTML += '<div id="second-modal" class="modal"></div>';

      modalManager.hideModal('second-modal');

      // Active modal should still be the first one
      expect(modalManager.activeModal).toBe(mockModal);
    });
  });

  describe('isModalVisible', () => {
    it('should return false when no modal is active', () => {
      expect(modalManager.isModalVisible()).toBe(false);
    });

    it('should return true when modal is active', () => {
      modalManager.showModal('test-modal');
      expect(modalManager.isModalVisible()).toBe(true);
    });
  });

  describe('getActiveModal', () => {
    it('should return null when no modal is active', () => {
      expect(modalManager.getActiveModal()).toBe(null);
    });

    it('should return active modal element', () => {
      modalManager.showModal('test-modal');
      expect(modalManager.getActiveModal()).toBe(mockModal);
    });
  });

  describe('overlay click handling', () => {
    it('should hide modal when overlay is clicked', () => {
      modalManager.showModal('test-modal');

      const clickEvent = new Event('click');
      mockOverlay.dispatchEvent(clickEvent);

      expect(modalManager.activeModal).toBe(null);
      expect(mockModal.classList.contains('modal-visible')).toBe(false);
    });

    it('should hide sidebar when overlay is clicked and sidebar is visible', () => {
      mockSidePanel.classList.add('visible');

      // Mock global sidebarManager
      const mockSidebarManager = { hide: vi.fn() };
      global.window.sidebarManager = mockSidebarManager;

      const clickEvent = new Event('click');
      mockOverlay.dispatchEvent(clickEvent);

      expect(mockSidebarManager.hide).toHaveBeenCalled();
    });
  });
});