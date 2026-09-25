import { translations } from './translations.js';
import { ModalManager } from './modalManager.js';
import { SidebarManager } from './sidebarManager.js';
import { ElementFactory } from './elementFactory.js';
import { NotificationManager } from './notificationManager.js';
import { TimerRenderer } from './timerRenderer.js';
import { ImportManager } from './importManager.js';
import { MassActionsManager } from './massActionsManager.js';
import { BackgroundPickerManager } from './backgroundPickerManager.js';

export class UIManager {
  constructor(timerManager, settingsManager) {
    this.timerManager = timerManager;
    this.settingsManager = settingsManager;
    this.translations = translations;

    // Initialize managers
    this.modalManager = new ModalManager();
    this.sidebarManager = new SidebarManager();
    this.notificationManager = new NotificationManager();

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
      dateColorInput: document.getElementById("date-color"),
      timerSizeRange: document.getElementById("timer-size-range"),
      timerSizeValue: document.getElementById("timer-size-value"),
      // Other elements
      modalTitle: document.getElementById("modal-title"),
      removeBtn: document.getElementById("remove-timer-btn")
    };

    // Feature-scoped sub-managers, each owning one area of the settings/import/bulk-action UI
    this.timerRenderer = new TimerRenderer(this.timerManager, this.settingsManager, this.translations, {
      onEditTimer: (index) => this.showTimerModal(true, index),
      onAddTimer: () => this.showTimerModal()
    });

    this.importManager = new ImportManager(
      this.timerManager,
      this.modalManager,
      this.notificationManager,
      () => this.renderTimers()
    );

    this.massActionsManager = new MassActionsManager(
      this.timerManager,
      this.modalManager,
      this.notificationManager,
      () => this.renderTimers()
    );

    this.backgroundPickerManager = new BackgroundPickerManager(this.settingsManager, this.notificationManager);

    this.initializeEventListeners();
    this.setupPrivacyShield();
    this.applyTimerScale(this.settingsManager.getCurrentSettings().timerScale);
  }

  initializeEventListeners() {
    // Timer-related events
    document.getElementById("add-timer-btn").addEventListener("click", () => this.showTimerModal());
    document.querySelector("#new-timer-btn-sidebar").addEventListener("click", () => this.showTimerModal());
    this.elements.timerForm.addEventListener("submit", (e) => this.handleTimerFormSubmit(e));

    // Settings-related events
    document.getElementById("settings-btn").addEventListener("click", () => this.showSettingsModal());
    this.elements.settingsForm.addEventListener("submit", (e) => this.handleSettingsFormSubmit(e));
    this.setupTimerSizePreview();

    // Privacy shield toggle
    this.elements.dateEl.addEventListener("dblclick", () => this.togglePrivacyShield());

    // Download timers
    document.getElementById("download-timers-btn").addEventListener("click", () => this.downloadTimers());

    // Import timers
    document.getElementById("import-timers-btn").addEventListener("click", () => this.importManager.show());

    // Mass delete timers
    document.getElementById("mass-delete-btn").addEventListener("click", () => this.massActionsManager.show());
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
        language: this.elements.languageSelect.value,
        dateColor: this.elements.dateColorInput?.value || this.settingsManager.getCurrentSettings().dateColor || "#333333",
        timerScale: this.getTimerScaleValue(),
        showWeekdays: document.getElementById("show-weekdays-toggle").checked
      };

      await this.settingsManager.updateSettings(newSettings);
      this.modalManager.hideModal("settings-modal");
      this.applyTimerScale(newSettings.timerScale);
      this.renderTimers();
      this.updateUI();
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
    if (this.sidebarManager.isOpen()) {
      this.sidebarManager.hide();
    }

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
    if (this.sidebarManager.isOpen()) {
      this.sidebarManager.hide();
    }

    this.modalManager.showModal("settings-modal", {
      setup: () => {
        this.populateDateFormatOptions();
        this.populateCurrentSettings();
        this.backgroundPickerManager.initialize();
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

  renderTimers() {
    this.timerRenderer.renderTimers();
  }

  updateUI() {
    const settings = this.settingsManager.getCurrentSettings();
    const today = new Date();

    this.elements.dateEl.textContent = this.settingsManager.formatDate(today);
    this.elements.dateEl.style.color = settings.dateColor || "#333333";

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

  setupTimerSizePreview() {
    if (!this.elements.timerSizeRange) {
      return;
    }

    this.elements.timerSizeRange.addEventListener("input", () => {
      const scale = this.getTimerScaleValue();
      this.applyTimerScale(scale);
      this.updateTimerSizeDisplay(scale);
    });
  }

  getTimerScaleValue() {
    if (!this.elements.timerSizeRange) {
      return this.settingsManager.getCurrentSettings().timerScale || 100;
    }

    const parsedScale = Number(this.elements.timerSizeRange.value);
    if (!Number.isFinite(parsedScale)) {
      return 100;
    }

    return Math.min(140, Math.max(70, parsedScale));
  }

  updateTimerSizeDisplay(scale) {
    if (this.elements.timerSizeValue) {
      this.elements.timerSizeValue.textContent = `${Math.round(scale)}%`;
    }
  }

  applyTimerScale(scaleValue) {
    const normalizedScale = Math.min(140, Math.max(70, Number(scaleValue) || 100));
    document.documentElement.style.setProperty("--timer-scale", (normalizedScale / 100).toFixed(2));
  }

  showError(message) {
    this.notificationManager.error(message);
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
      'date-color-label': this.translations[settings.language].dateColor || 'Date Color',
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

  populateCurrentSettings() {
    const settings = this.settingsManager.getCurrentSettings();
    document.getElementById("date-format-select").value = settings.dateFormat;
    document.getElementById("display-font").value = settings.displayFont;
    document.getElementById("language").value = settings.language;
    if (this.elements.dateColorInput) {
      this.elements.dateColorInput.value = settings.dateColor || "#333333";
    }
    if (this.elements.timerSizeRange) {
      this.elements.timerSizeRange.value = settings.timerScale || 100;
      this.updateTimerSizeDisplay(settings.timerScale || 100);
      this.applyTimerScale(settings.timerScale || 100);
    }
    document.getElementById("show-weekdays-toggle").checked = settings.showWeekdays !== false;
  }
}
