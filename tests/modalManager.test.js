import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ModalManager } from '../modules/modalManager.js';

describe('ModalManager', () => {
  let modalManager;
  let firstModal;
  let secondModal;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="test-modal" class="modal fade" tabindex="-1">
        <div class="modal-dialog"><div class="modal-content"></div></div>
      </div>
      <div id="second-modal" class="modal fade" tabindex="-1">
        <div class="modal-dialog"><div class="modal-content"></div></div>
      </div>
    `;

    firstModal = document.getElementById('test-modal');
    secondModal = document.getElementById('second-modal');
    modalManager = new ModalManager();
  });

  it('shows a modal and tracks it as active', () => {
    modalManager.showModal('test-modal');

    expect(firstModal.classList.contains('show')).toBe(true);
    expect(modalManager.getActiveModal()).toBe(firstModal);
    expect(modalManager.isModalVisible()).toBe(true);
  });

  it('runs setup callback before showing', () => {
    const setup = vi.fn();
    modalManager.showModal('test-modal', { setup });

    expect(setup).toHaveBeenCalledWith(firstModal);
  });

  it('hides the previously active modal before showing another', () => {
    modalManager.showModal('test-modal');
    modalManager.showModal('second-modal');

    expect(firstModal.classList.contains('show')).toBe(false);
    expect(secondModal.classList.contains('show')).toBe(true);
    expect(modalManager.getActiveModal()).toBe(secondModal);
  });

  it('can hide specific modal by id', () => {
    modalManager.showModal('test-modal');
    modalManager.hideModal('test-modal');

    expect(firstModal.classList.contains('show')).toBe(false);
    expect(modalManager.getActiveModal()).toBe(null);
  });

  it('can hide active modal', () => {
    modalManager.showModal('test-modal');
    modalManager.hideActiveModal();

    expect(firstModal.classList.contains('show')).toBe(false);
    expect(modalManager.isModalVisible()).toBe(false);
  });

  it('returns false when no modal is visible', () => {
    expect(modalManager.isModalVisible()).toBe(false);
  });

  it('logs error when modal id does not exist', () => {
    const errorSpy = vi.spyOn(console, 'error');
    modalManager.showModal('missing-modal');

    expect(errorSpy).toHaveBeenCalledWith('Modal with id "missing-modal" not found');
  });
});
