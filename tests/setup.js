// Test setup file for DayWatch Chrome Extension
import { vi } from 'vitest';

// Mock Chrome Extension APIs
global.chrome = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn()
    }
  },
  runtime: {
    getURL: vi.fn((path) => `chrome-extension://test-id/${path}`)
  }
};

// Mock localStorage for TimerManager
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
};
global.localStorage = localStorageMock;

// Mock DOM APIs that might not be available in test environment
global.URL = {
  createObjectURL: vi.fn(() => 'blob:test-url'),
  revokeObjectURL: vi.fn()
};

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};

// Mock alert function
global.alert = vi.fn();

class MockBootstrapModal {
  static instances = new WeakMap();

  constructor(element) {
    this.element = element;
    MockBootstrapModal.instances.set(element, this);
  }

  show() {
    this.element.classList.add('show');
    this.element.style.display = 'block';
    this.element.dispatchEvent(new Event('shown.bs.modal'));
  }

  hide() {
    this.element.classList.remove('show');
    this.element.style.display = 'none';
    this.element.dispatchEvent(new Event('hidden.bs.modal'));
  }

  static getOrCreateInstance(element) {
    return MockBootstrapModal.instances.get(element) || new MockBootstrapModal(element);
  }
}

class MockBootstrapTab {
  static instances = new WeakMap();

  constructor(element) {
    this.element = element;
    MockBootstrapTab.instances.set(element, this);
  }

  show() {
    const tabContainer = this.element.closest('[role="tablist"]');
    if (!tabContainer) return;

    tabContainer.querySelectorAll('[data-bs-toggle="tab"]').forEach((button) => {
      button.classList.remove('active');
      button.setAttribute('aria-selected', 'false');
    });

    this.element.classList.add('active');
    this.element.setAttribute('aria-selected', 'true');

    const target = this.element.dataset.bsTarget;
    if (!target) return;
    const pane = document.querySelector(target);
    if (!pane) return;

    const contentContainer = pane.closest('.tab-content');
    if (!contentContainer) return;

    contentContainer.querySelectorAll('.tab-pane').forEach((tabPane) => {
      tabPane.classList.remove('show', 'active');
    });

    pane.classList.add('show', 'active');
  }

  static getOrCreateInstance(element) {
    return MockBootstrapTab.instances.get(element) || new MockBootstrapTab(element);
  }
}

global.bootstrap = {
  Modal: MockBootstrapModal,
  Tab: MockBootstrapTab
};
global.window.bootstrap = global.bootstrap;

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
  localStorageMock.getItem.mockReturnValue(null);
  document.body.innerHTML = '';
});
