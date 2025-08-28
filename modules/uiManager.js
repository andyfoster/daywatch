import { translations } from './translations.js';
import { ModalManager } from './modalManager.js';
import { SidebarManager } from './sidebarManager.js';
import { ElementFactory } from './elementFactory.js';

export class UIManager {
  constructor(timerManager, settingsManager) {
    this.timerManager = timerManager;
    this.settingsManager = settingsManager;
    this.translations = translations;

    // Initialize managers
    this.modalManager = new ModalManager();
    this.sidebarManager = new SidebarManager();

    // Make managers globally accessible
    window.modalManager = this.modalManager;
    window.sidebarManager = this.sidebarManager;

    // Cache essential DOM elements only
    this.elements = {
      timersContainer: document.getElementById("timers-container"),
      dateEl: document.getElementById("date"),
      // Form elements
      timerForm: document.getElementById("timer-form"),
      settingsForm: document.getElementById("settings-form"),
      // Input elements
      eventNameInput: document.getElementById("event-name"),
      eventDateInput: document.getElementById("event-date"),
      eventTimeInput: document.getElementById("event-time"),
      eventColorInput: document.getElementById("event-color"),
      eventLocationInput: document.getElementById("event-location"),
      eventLinkInput: document.getElementById("event-link"),
      // Settings elements
      dateFormatSelect: document.getElementById("date-format-select"),
      displayFontSelect: document.getElementById("display-font"),
      languageSelect: document.getElementById("language"),
      // Other elements
      modalTitle: document.getElementById("modal-title"),
      removeBtn: document.getElementById("remove-timer-btn")
    };

    this.initializeEventListeners();
    this.setupPrivacyShield();
  }

  initializeEventListeners() {
    // Timer-related events
    document.getElementById("add-timer-btn").addEventListener("click", () => this.showTimerModal());
    document.querySelector("#new-timer-btn-sidebar").addEventListener("click", () => this.showTimerModal());
    document.querySelector("#timer-modal .close").addEventListener("click", () => this.modalManager.hideModal("timer-modal"));
    this.elements.timerForm.addEventListener("submit", (e) => this.handleTimerFormSubmit(e));

    // Settings-related events
    document.getElementById("settings-btn").addEventListener("click", () => this.showSettingsModal());
    document.querySelector("#settings-modal .close").addEventListener("click", () => this.modalManager.hideModal("settings-modal"));
    this.elements.settingsForm.addEventListener("submit", (e) => this.handleSettingsFormSubmit(e));

    // Privacy shield toggle
    this.elements.dateEl.addEventListener("dblclick", () => this.togglePrivacyShield());

    // Download timers
    document.getElementById("download-timers-btn").addEventListener("click", () => this.downloadTimers());

    // Import timers
    document.getElementById("import-timers-btn").addEventListener("click", () => this.showImportModal());
    document.querySelector("#import-modal .close").addEventListener("click", () => this.modalManager.hideModal("import-modal"));
  }

  async handleTimerFormSubmit(event) {
    event.preventDefault();
    try {
      const formData = this.getTimerFormData();

      if (this.editIndex !== undefined) {
        await this.timerManager.editTimer(this.editIndex, formData.name, formData.date, formData.color, formData.showOnMainScreen, formData.time, formData.location, formData.link);
      } else {
        await this.timerManager.addTimer(formData.name, formData.date, formData.color, formData.showOnMainScreen, formData.time, formData.location, formData.link);
      }

      // Sort timers after adding/editing
      this.timerManager.sortTimers();

      this.modalManager.hideModal("timer-modal");
      this.renderTimers();
    } catch (error) {
      this.showError(error.message);
    }
  }

  async handleSettingsFormSubmit(event) {
    event.preventDefault();
    try {
      const newSettings = {
        dateFormat: this.elements.dateFormatSelect.value,
        displayFont: this.elements.displayFontSelect.value,
        language: this.elements.languageSelect.value
      };

      await this.settingsManager.updateSettings(newSettings);
      this.modalManager.hideModal("settings-modal");
      this.renderTimers();
      this.updateUI();
      location.reload();
    } catch (error) {
      this.showError(error.message);
    }
  }

  getTimerFormData() {
    return {
      name: this.elements.eventNameInput.value,
      date: this.elements.eventDateInput.value,
      color: this.elements.eventColorInput.value,
      showOnMainScreen: document.getElementById("show-on-main-screen").checked,
      time: this.elements.eventTimeInput.value || null,
      location: this.elements.eventLocationInput.value || null,
      link: this.elements.eventLinkInput.value || null
    };
  }

  showTimerModal(isEdit = false, index) {
    this.editIndex = isEdit ? index : undefined;

    const settings = this.settingsManager.getCurrentSettings();
    this.elements.modalTitle.textContent = isEdit ?
      this.translations[settings.language].editTimer :
      this.translations[settings.language].newTimer;

    this.modalManager.showModal("timer-modal", {
      setup: () => {
        this.elements.removeBtn.style.display = isEdit ? "block" : "none";

        if (isEdit) {
          const timer = this.timerManager.getTimers()[index];
          this.populateTimerForm(timer);
          this.elements.removeBtn.onclick = () => {
            this.timerManager.removeTimer(index);
            this.modalManager.hideModal("timer-modal");
            this.renderTimers();
          };
        } else {
          this.resetForm();
        }
      }
    });
  }

  showSettingsModal() {
    this.modalManager.showModal("settings-modal", {
      setup: () => {
        this.populateDateFormatOptions();
      }
    });
  }

  populateTimerForm(timer) {
    this.elements.eventNameInput.value = timer.name;
    this.elements.eventDateInput.value = new Date(timer.date).toISOString().slice(0, 10);
    this.elements.eventTimeInput.value = timer.time || '';
    this.elements.eventColorInput.value = timer.color;
    this.elements.eventLocationInput.value = timer.location || '';
    this.elements.eventLinkInput.value = timer.link || '';
    document.getElementById("show-on-main-screen").checked = timer.showOnMainScreen ?? true;
  }



  setupPrivacyShield() {
    const settings = this.settingsManager.getCurrentSettings();
    if (settings.hideTimers) {
      this.elements.timersContainer.classList.add("privacy-shield");
    }
  }

  togglePrivacyShield() {
    const isHidden = this.elements.timersContainer.classList.toggle("privacy-shield");
    this.settingsManager.updateSettings({ hideTimers: isHidden });
  }

  downloadTimers() {
    const filename = "timers.txt";
    const text = this.timerManager.exportTimers();
    ElementFactory.createDownloadLink(filename, text);
  }

  showImportModal() {
    this.modalManager.showModal("import-modal", {
      setup: () => {
        this.initializeImportModal();
      }
    });
  }

  initializeImportModal() {
    // Reset modal state
    this.resetImportModal();

    // Only set up event listeners if not already done
    if (!this.importModalInitialized) {
      this.setupImportEventListeners();
      this.importModalInitialized = true;
    }
  }

  setupImportEventListeners() {
    // Set up tab switching
    const tabs = document.querySelectorAll('.import-tab');
    const sections = document.querySelectorAll('.import-section');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab;

        // Update active tab
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Update active section
        sections.forEach(s => s.classList.remove('active'));
        document.getElementById(`${targetTab}-import`).classList.add('active');
      });
    });

    // Set up file upload
    this.setupFileUpload();

    // Set up text import
    this.setupTextImport();

    // Set up preview and import buttons
    document.getElementById('preview-import-btn').addEventListener('click', () => this.previewImport());
    document.getElementById('confirm-import-btn').addEventListener('click', () => this.confirmImport());
  }

  resetImportModal() {
    // Reset tabs
    document.querySelectorAll('.import-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelector('.import-tab[data-tab="file"]').classList.add('active');

    // Reset sections
    document.querySelectorAll('.import-section').forEach(section => section.classList.remove('active'));
    document.getElementById('file-import').classList.add('active');

    // Reset form elements
    document.getElementById('file-input').value = '';
    document.getElementById('import-text').value = '';
    document.getElementById('import-format').value = 'auto';
    document.getElementById('import-mode').value = 'replace';

    // Reset preview
    document.getElementById('import-preview').style.display = 'none';
    document.getElementById('confirm-import-btn').disabled = true;

    this.importData = null;
  }

  setupFileUpload() {
    const fileInput = document.getElementById('file-input');
    const browseBtn = document.getElementById('browse-btn');
    const dropZone = document.getElementById('file-drop-zone');

    // Browse button click
    browseBtn.addEventListener('click', () => fileInput.click());

    // File input change
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        this.handleFileUpload(e.target.files[0]);
      }
    });

    // Drag and drop
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');

      if (e.dataTransfer.files.length > 0) {
        this.handleFileUpload(e.dataTransfer.files[0]);
      }
    });
  }

  setupTextImport() {
    const textArea = document.getElementById('import-text');
    const formatSelect = document.getElementById('import-format');

    textArea.addEventListener('input', () => {
      // Auto-detect format when text changes
      if (formatSelect.value === 'auto' && textArea.value.trim()) {
        const detectedFormat = this.timerManager.detectImportFormat(textArea.value);
        // Update format display (but keep auto selected)
        this.updateFormatHint(detectedFormat);
      }
    });
  }

  async handleFileUpload(file) {
    try {
      const text = await this.readFileAsText(file);

      // Switch to text tab and populate
      document.querySelector('.import-tab[data-tab="text"]').click();
      document.getElementById('import-text').value = text;

      // Auto-detect format
      const detectedFormat = this.timerManager.detectImportFormat(text);
      document.getElementById('import-format').value = detectedFormat;
      this.updateFormatHint(detectedFormat);

      this.showNotification(`File "${file.name}" loaded successfully`, 'success');
    } catch (error) {
      this.showError(`Failed to read file: ${error.message}`);
    }
  }

  readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  updateFormatHint(format) {
    const formatSelect = document.getElementById('import-format');
    const currentOption = formatSelect.querySelector(`option[value="${format}"]`);
    if (currentOption) {
      // Add a hint to show detected format
      const autoOption = formatSelect.querySelector('option[value="auto"]');
      autoOption.textContent = `Auto-detect (${format.toUpperCase()} detected)`;
    }
  }

  previewImport() {
    try {
      const text = document.getElementById('import-text').value.trim();
      if (!text) {
        this.showError('Please enter or upload some data to import');
        return;
      }

      const format = document.getElementById('import-format').value;
      const mode = document.getElementById('import-mode').value;

      // Parse the import data without actually importing
      const tempManager = Object.create(this.timerManager);
      tempManager.timers = []; // Start with empty array for preview

      const result = tempManager.importTimers(text, { format, mode: 'append' });

      if (result.success) {
        this.importData = { text, format, mode };
        this.showImportPreview(tempManager.timers, result);
        document.getElementById('confirm-import-btn').disabled = false;
      }
    } catch (error) {
      this.showError(error.message);
      document.getElementById('import-preview').style.display = 'none';
      document.getElementById('confirm-import-btn').disabled = true;
    }
  }

  showImportPreview(timers, result) {
    const previewDiv = document.getElementById('import-preview');
    const contentDiv = document.getElementById('preview-content');
    const summaryP = document.getElementById('preview-summary');

    // Clear previous content
    contentDiv.innerHTML = '';

    // Show preview of first few timers
    const previewCount = Math.min(timers.length, 5);
    for (let i = 0; i < previewCount; i++) {
      const timer = timers[i];
      const timerDiv = document.createElement('div');
      timerDiv.className = 'preview-timer';
      timerDiv.style.borderLeftColor = timer.color;

      const date = new Date(timer.date).toLocaleDateString();
      const timeStr = timer.time ? ` at ${timer.time}` : '';
      const locationStr = timer.location ? ` (${timer.location})` : '';

      timerDiv.innerHTML = `
        <strong>${timer.name}</strong><br>
        <small>${date}${timeStr}${locationStr}</small>
      `;

      contentDiv.appendChild(timerDiv);
    }

    // Show "and X more..." if there are more timers
    if (timers.length > previewCount) {
      const moreDiv = document.createElement('div');
      moreDiv.className = 'preview-more';
      moreDiv.textContent = `... and ${timers.length - previewCount} more timers`;
      moreDiv.style.textAlign = 'center';
      moreDiv.style.color = '#666';
      moreDiv.style.fontStyle = 'italic';
      moreDiv.style.padding = '10px';
      contentDiv.appendChild(moreDiv);
    }

    // Update summary
    const mode = document.getElementById('import-mode').value;
    const currentCount = this.timerManager.getTimers().length;
    const newTotal = mode === 'replace' ? result.imported : currentCount + result.imported;

    summaryP.textContent = `${result.imported} timer(s) will be imported. ` +
      `Total after import: ${newTotal} timer(s).`;

    // Show preview
    previewDiv.style.display = 'block';
  }

  async confirmImport() {
    if (!this.importData) {
      this.showError('No import data available. Please preview first.');
      return;
    }

    try {
      const { text, format, mode } = this.importData;
      const result = this.timerManager.importTimers(text, { format, mode });

      if (result.success) {
        this.modalManager.hideModal("import-modal");
        this.renderTimers();
        this.showNotification(
          `Successfully imported ${result.imported} timer(s). Total: ${result.total}`,
          'success'
        );
      }
    } catch (error) {
      this.showError(error.message);
    }
  }

  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 6px;
      color: white;
      font-weight: 500;
      z-index: 10001;
      transform: translateX(100%);
      transition: transform 0.3s ease;
    `;

    // Set background color based on type
    switch (type) {
      case 'success':
        notification.style.backgroundColor = '#28a745';
        break;
      case 'error':
        notification.style.backgroundColor = '#dc3545';
        break;
      case 'warning':
        notification.style.backgroundColor = '#ffc107';
        notification.style.color = '#212529';
        break;
      default:
        notification.style.backgroundColor = '#17a2b8';
    }

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);

    // Auto remove after 4 seconds
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 4000);
  }

  renderTimers() {
    this.renderMainTimers();
    this.renderSidebarEvents();
  }

  renderMainTimers() {
    this.elements.timersContainer.innerHTML = "";
    const timers = this.timerManager.getTimers();

    timers.forEach((timer, index) => {
      if (timer.showOnMainScreen) {
        this.createTimerElement(timer, index);
      }
    });
  }

  createTimerElement(timer, index) {
    const { isEventToday, daysRemaining } = this.calculateTimerData(timer);
    const settings = this.settingsManager.getCurrentSettings();

    // Create main timer container
    const timerEl = document.createElement("div");
    timerEl.classList.add("timer");
    if (isEventToday) {
      timerEl.classList.add("today-timer");
      timerEl.style.borderColor = timer.color;
    }
    timerEl.style.fontFamily = settings.displayFont;

    // Create and append elements using ElementFactory
    const headerEl = ElementFactory.createTimerHeader(isEventToday, daysRemaining, this.translations, settings.language);
    const nameEl = ElementFactory.createTimerName(timer);
    const locationEl = ElementFactory.createLocationElement(timer);
    const editBtn = ElementFactory.createEditButton(timer, index, this.showTimerModal.bind(this), this.settingsManager);

    // Append elements
    timerEl.appendChild(headerEl);
    timerEl.appendChild(nameEl);
    if (locationEl) {
      timerEl.appendChild(locationEl);
    }
    timerEl.appendChild(editBtn);

    this.elements.timersContainer.appendChild(timerEl);
  }

  calculateTimerData(timer) {
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    const eventDate = new Date(timer.date);
    eventDate.setHours(0, 0, 0, 0);

    const isEventToday = eventDate.getTime() === currentDate.getTime();
    const timeDifference = eventDate - currentDate;
    const daysRemaining = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));

    return { isEventToday, daysRemaining };
  }

  renderSidebarEvents() {
    const sidebarList = document.getElementById("events-list");
    sidebarList.innerHTML = "";

    const timers = this.timerManager.getTimers();
    timers.forEach((timer, index) => {
      const li = this.createSidebarEventItem(timer, index);
      sidebarList.appendChild(li);
    });
  }

  createSidebarEventItem(timer, index) {
    const li = document.createElement("li");
    li.style.color = timer.color;
    li.setAttribute("data-date", new Date(timer.date).toLocaleDateString());
    li.classList.add(timer.showOnMainScreen ? "shown-on-main" : "not-shown-on-main");

    // Create event text
    const eventNameSpan = ElementFactory.createSidebarEventText(timer);
    li.appendChild(eventNameSpan);

    // Add location if available
    const locationEl = ElementFactory.createLocationElement(timer, "sidebar-location");
    if (locationEl) {
      li.appendChild(document.createElement("br"));
      li.appendChild(locationEl);
    }

    // Add click handler
    li.addEventListener("click", () => this.showTimerModal(true, index));

    return li;
  }

  updateUI() {
    const settings = this.settingsManager.getCurrentSettings();
    const today = new Date();

    this.elements.dateEl.textContent = today.toLocaleDateString(settings.language, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });

    this.updateTranslations();
  }

  resetForm() {
    this.elements.eventNameInput.value = "";
    this.elements.eventDateInput.value = "";
    this.elements.eventTimeInput.value = "";
    this.elements.eventColorInput.value = "#000000";
    this.elements.eventLocationInput.value = "";
    this.elements.eventLinkInput.value = "";
    document.getElementById("show-on-main-screen").checked = true;
    this.editIndex = undefined;
  }

  showError(message) {
    console.error(message);
    alert(message);
  }

  updateTranslations() {
    const settings = this.settingsManager.getCurrentSettings();
    const elements = {
      'modal-title': this.translations[settings.language].newTimer,
      'event-name-label': this.translations[settings.language].eventName,
      'event-date-label': this.translations[settings.language].eventDate,
      'color-label': this.translations[settings.language].color,
      'submit-timer-btn': this.translations[settings.language].save,
      'remove-timer-btn': this.translations[settings.language].remove,
      'settings-title': this.translations[settings.language].settings,
      'save-settings-btn': this.translations[settings.language].save,
      'date-format-label': this.translations[settings.language].dateFormat,
      'display-font-label': this.translations[settings.language].font,
      'language-label': this.translations[settings.language].language
    };

    Object.entries(elements).forEach(([id, text]) => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = text;
      }
    });
  }

  populateDateFormatOptions() {
    this.elements.dateFormatSelect.innerHTML = "";
    const options = this.settingsManager.getDateFormatOptionsForLanguage();

    options.forEach(option => {
      const optionEl = document.createElement("option");
      optionEl.value = option.value;
      optionEl.text = option.label;
      this.elements.dateFormatSelect.add(optionEl);
    });
  }
}