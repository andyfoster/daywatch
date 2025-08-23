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