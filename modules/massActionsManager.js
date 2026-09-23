import { ElementFactory } from './elementFactory.js';

export class MassActionsManager {
  constructor(timerManager, modalManager, notificationManager, onChangeComplete) {
    this.timerManager = timerManager;
    this.modalManager = modalManager;
    this.notificationManager = notificationManager;
    this.onChangeComplete = onChangeComplete || (() => {});
    this.initialized = false;
  }

  show() {
    this.modalManager.showModal("mass-delete-modal", {
      setup: () => {
        this.populateTimerSelectionList();
        if (!this.initialized) {
          this.setupEventListeners();
          this.initialized = true;
        }
        this.updateSelectAllState();
        this.updateSelectedCount();
      }
    });
  }

  populateTimerSelectionList() {
    const container = document.getElementById('timer-selection-list');
    container.innerHTML = '';

    const timers = this.timerManager.getTimers();
    const now = new Date();

    if (timers.length === 0) {
      container.innerHTML = '<p>No timers available.</p>';
      return;
    }

    timers.forEach((timer, index) => {
      const item = document.createElement('div');
      item.className = 'timer-checkbox-item';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `timer-${index}`;
      checkbox.dataset.index = index;

      const info = document.createElement('div');
      info.className = 'timer-checkbox-info';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'timer-checkbox-name';
      nameSpan.textContent = timer.name;
      nameSpan.style.color = ElementFactory.getReadableColor(timer.color);

      const dateSpan = document.createElement('span');
      dateSpan.className = 'timer-checkbox-date';
      dateSpan.textContent = new Date(timer.date).toLocaleDateString();

      const statusSpan = document.createElement('span');
      statusSpan.className = 'timer-checkbox-status';

      const targetDate = new Date(timer.date);
      const diffTime = targetDate - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        statusSpan.textContent = 'Past';
        statusSpan.classList.add('past');
      } else if (diffDays === 0) {
        statusSpan.textContent = 'Today';
        statusSpan.classList.add('today');
      } else {
        statusSpan.textContent = 'Future';
        statusSpan.classList.add('future');
      }

      if (!timer.showOnMainScreen) {
        statusSpan.textContent += ' (Hidden)';
      }

      info.appendChild(nameSpan);
      info.appendChild(dateSpan);
      info.appendChild(statusSpan);

      item.appendChild(checkbox);
      item.appendChild(info);

      container.appendChild(item);
    });
  }

  setupEventListeners() {
    const selectAllCheckbox = document.getElementById('select-all-timers');
    const timerSelectionList = document.getElementById('timer-selection-list');
    const confirmBtn = document.getElementById('confirm-mass-delete-btn');
    const hideBtn = document.getElementById('confirm-mass-hide-btn');
    const cancelBtn = document.getElementById('cancel-mass-delete-btn');

    if (!selectAllCheckbox || !timerSelectionList || !confirmBtn || !cancelBtn) {
      return;
    }

    selectAllCheckbox.addEventListener('change', () => {
      document.querySelectorAll('#timer-selection-list input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
      });
      this.updateSelectedCount();
      this.updateSelectAllState();
    });

    // Individual checkbox changes (event delegation for dynamic rows)
    timerSelectionList.addEventListener('change', (event) => {
      if (event.target.matches('input[type="checkbox"]')) {
        this.updateSelectedCount();
        this.updateSelectAllState();
      }
    });

    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const filter = btn.dataset.filter;
        this.applyQuickFilter(filter);
      });
    });

    confirmBtn.addEventListener('click', () => {
      this.confirmMassDelete();
    });

    if (hideBtn) {
      hideBtn.addEventListener('click', () => {
        this.confirmMassHide();
      });
    }

    cancelBtn.addEventListener('click', () => {
      this.modalManager.hideModal("mass-delete-modal");
    });
  }

  updateSelectAllState() {
    const selectAllCheckbox = document.getElementById('select-all-timers');
    const timerCheckboxes = document.querySelectorAll('#timer-selection-list input[type="checkbox"]');
    const checkedCount = document.querySelectorAll('#timer-selection-list input[type="checkbox"]:checked').length;

    if (!selectAllCheckbox) {
      return;
    }

    if (timerCheckboxes.length === 0) {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.indeterminate = false;
      return;
    }

    selectAllCheckbox.checked = checkedCount === timerCheckboxes.length;
    selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < timerCheckboxes.length;
  }

  updateSelectedCount() {
    const checkedBoxes = document.querySelectorAll('#timer-selection-list input[type="checkbox"]:checked');
    const count = checkedBoxes.length;
    const selectedCountSpan = document.getElementById('selected-count');
    const confirmBtn = document.getElementById('confirm-mass-delete-btn');
    const hideBtn = document.getElementById('confirm-mass-hide-btn');

    if (selectedCountSpan) {
      selectedCountSpan.textContent = `${count} timer${count !== 1 ? 's' : ''} selected`;
    }
    if (confirmBtn) {
      confirmBtn.disabled = count === 0;
    }
    if (hideBtn) {
      hideBtn.disabled = count === 0;
    }
  }

  applyQuickFilter(filter) {
    const checkboxes = document.querySelectorAll('#timer-selection-list input[type="checkbox"]');
    const timers = this.timerManager.getTimers();
    const now = new Date();

    checkboxes.forEach((checkbox, index) => {
      const timer = timers[index];
      const targetDate = new Date(timer.date);
      const diffDays = Math.ceil((targetDate - now) / (1000 * 60 * 60 * 24));

      let shouldSelect = false;

      switch (filter) {
        case 'past':
          shouldSelect = diffDays < 0;
          break;
        case 'future':
          shouldSelect = diffDays > 0;
          break;
        case 'hidden':
          shouldSelect = !timer.showOnMainScreen;
          break;
      }

      checkbox.checked = shouldSelect;
    });

    this.updateSelectAllState();
    this.updateSelectedCount();
  }

  getSelectedTimerIndices() {
    const checkedBoxes = document.querySelectorAll('#timer-selection-list input[type="checkbox"]:checked');
    return Array.from(checkedBoxes).map(cb => parseInt(cb.dataset.index, 10));
  }

  confirmMassHide() {
    const indices = this.getSelectedTimerIndices();
    if (indices.length === 0) {
      return;
    }

    const updatedCount = this.timerManager.setTimersVisibility(indices, false);
    this.modalManager.hideModal("mass-delete-modal");
    this.onChangeComplete();
    this.notificationManager.show(`Successfully hid ${updatedCount} timer${updatedCount !== 1 ? 's' : ''}`, 'success');
  }

  confirmMassDelete() {
    const indices = this.getSelectedTimerIndices();

    if (indices.length === 0) return;

    const confirmMessage = `Are you sure you want to delete ${indices.length} timer${indices.length !== 1 ? 's' : ''}? This action cannot be undone.`;

    if (confirm(confirmMessage)) {
      // Sort indices in descending order to avoid index shifting issues
      indices.sort((a, b) => b - a);

      indices.forEach(index => {
        this.timerManager.removeTimer(index);
      });

      this.modalManager.hideModal("mass-delete-modal");
      this.onChangeComplete();
      this.notificationManager.show(`Successfully deleted ${indices.length} timer${indices.length !== 1 ? 's' : ''}`, 'success');
    }
  }
}
