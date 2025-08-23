import { translations } from './translations.js';

export class UIManager {
  constructor(timerManager, settingsManager) {
    this.timerManager = timerManager;
    this.settingsManager = settingsManager;
    this.translations = translations;
    this.isSidebarVisible = false;
    this.isModalVisible = false;

    // Cache DOM elements
    this.elements = {
      timersContainer: document.getElementById("timers-container"),
      addTimerBtn: document.getElementById("add-timer-btn"),
      timerModal: document.getElementById("timer-modal"),
      modalTitle: document.getElementById("modal-title"),
      timerForm: document.getElementById("timer-form"),
      eventNameInput: document.getElementById("event-name"),
      eventDateInput: document.getElementById("event-date"),
      eventTimeInput: document.getElementById("event-time"),
      eventColorInput: document.getElementById("event-color"),
      eventLocationInput: document.getElementById("event-location"),
      eventLinkInput: document.getElementById("event-link"),
      closeBtn: document.querySelector(".close"),
      dateEl: document.getElementById("date"),
      removeBtn: document.getElementById("remove-timer-btn"),
      settingsBtn: document.getElementById("settings-btn"),
      settingsModal: document.getElementById("settings-modal"),
      settingsForm: document.getElementById("settings-form"),
      dateFormatSelect: document.getElementById("date-format-select"),
      displayFontSelect: document.getElementById("display-font"),
      languageSelect: document.getElementById("language"),
      settingsCloseBtn: document.querySelector("#settings-modal .close"),
      sidebarNewTimerBtn: document.querySelector("#new-timer-btn-sidebar"),
      togglePanel: document.getElementById("toggle-panel"),
      overlay: document.getElementById("overlay"),
      sidebarContainer: document.getElementById("sidebar-container"),
      toggleArrow: document.getElementById("toggle-arrow"),
      downloadTimersBtn: document.getElementById("download-timers-btn"),
      sidePanel: document.getElementById("events-side-panel")
    };

    this.initializeEventListeners();
    this.setupPrivacyShield();
  }

  initializeEventListeners() {
    // Timer-related events
    this.elements.addTimerBtn.addEventListener("click", () => this.showModal());
    this.elements.sidebarNewTimerBtn.addEventListener("click", () => this.showModal());
    this.elements.closeBtn.addEventListener("click", () => this.hideModal());
    this.elements.timerForm.addEventListener("submit", (e) => this.handleTimerFormSubmit(e));

    // Settings-related events
    this.elements.settingsBtn.addEventListener("click", () => this.showSettings());
    this.elements.settingsCloseBtn.addEventListener("click", () => this.hideSettings());
    this.elements.settingsForm.addEventListener("submit", (e) => this.handleSettingsFormSubmit(e));

    // Sidebar and overlay events
    this.elements.togglePanel.addEventListener("click", () => this.toggleSidebar());
    this.elements.overlay.addEventListener("click", () => {
      if (this.isSidebarVisible) {
        this.toggleSidebar();
      }
      if (this.isModalVisible) {
        this.hideModal();
      }
    });

    // Privacy shield toggle
    this.elements.dateEl.addEventListener("dblclick", () => this.togglePrivacyShield());

    // Download timers
    this.elements.downloadTimersBtn.addEventListener("click", () => this.downloadTimers());
  }

  async handleTimerFormSubmit(event) {
    event.preventDefault();
    try {
      const showOnMainScreen = document.getElementById("show-on-main-screen").checked;
      const time = this.elements.eventTimeInput.value || null;
      const location = this.elements.eventLocationInput.value || null;
      const link = this.elements.eventLinkInput.value || null;
      const formData = {
        name: this.elements.eventNameInput.value,
        date: this.elements.eventDateInput.value,
        color: this.elements.eventColorInput.value,
        showOnMainScreen,
        time,
        location,
        link
      };

      if (this.editIndex !== undefined) {
        await this.timerManager.editTimer(this.editIndex, formData.name, formData.date, formData.color, formData.showOnMainScreen, formData.time, formData.location, formData.link);
      } else {
        await this.timerManager.addTimer(formData.name, formData.date, formData.color, formData.showOnMainScreen, formData.time, formData.location, formData.link);
      }

      this.hideModal();
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
      this.hideSettings();
      this.renderTimers();
      this.updateUI();
      location.reload();
    } catch (error) {
      this.showError(error.message);
    }
  }

  showModal(isEdit = false, index) {
    this.editIndex = isEdit ? index : undefined;
    this.elements.removeBtn.style.display = isEdit ? "block" : "none";

    const settings = this.settingsManager.getCurrentSettings();
    this.elements.modalTitle.textContent = isEdit ?
      this.translations[settings.language].editTimer :
      this.translations[settings.language].newTimer;

    if (isEdit) {
      const timer = this.timerManager.getTimers()[index];
      this.elements.eventNameInput.value = timer.name;
      this.elements.eventDateInput.value = new Date(timer.date).toISOString().slice(0, 10);
      this.elements.eventTimeInput.value = timer.time || '';
      this.elements.eventColorInput.value = timer.color;
      this.elements.eventLocationInput.value = timer.location || '';
      this.elements.eventLinkInput.value = timer.link || '';
      document.getElementById("show-on-main-screen").checked = timer.showOnMainScreen ?? true;

      this.elements.removeBtn.onclick = () => {
        this.timerManager.removeTimer(index);
        this.hideModal();
        this.renderTimers();
      };
    } else {
      this.resetForm();
    }

    this.elements.timerModal.style.display = "block";
    this.elements.overlay.style.display = "block";
    this.isModalVisible = true;
  }

  hideModal() {
    this.elements.timerModal.style.display = "none";
    if (!this.isSidebarVisible) {
      this.elements.overlay.style.display = "none";
    }
    this.isModalVisible = false;
    this.resetForm();
  }

  showSettings() {
    this.elements.timerModal.style.display = "none";
    this.elements.settingsModal.style.display = "block";
    this.populateDateFormatOptions();
  }

  hideSettings() {
    this.elements.settingsModal.style.display = "none";
  }

  toggleSidebar() {
    this.elements.sidePanel.classList.toggle("visible");

    if (this.isSidebarVisible) {
      this.elements.sidebarContainer.style.transform = "translateX(-100%)";
      this.elements.toggleArrow.textContent = ">";
      if (!this.isModalVisible) {
        this.elements.overlay.style.display = "none";
      }
    } else {
      this.elements.sidebarContainer.style.transform = "translateX(0)";
      this.elements.toggleArrow.textContent = "<";
      this.elements.overlay.style.display = "block";
    }

    this.isSidebarVisible = !this.isSidebarVisible;
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
    const element = document.createElement("a");
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));

    element.href = url;
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(url);
  }

  renderTimers() {
    this.renderMainTimers();
    this.renderSidebarEvents();
  }

  renderMainTimers() {
    this.elements.timersContainer.innerHTML = "";
    const timers = this.timerManager.getTimers();
    const settings = this.settingsManager.getCurrentSettings();

    timers.forEach((timer, index) => {
      if (timer.showOnMainScreen) {
        this.createTimerElement(timer, index);
      }
    });
  }

  createTimerElement(timer, index) {
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    const eventDate = new Date(timer.date);
    eventDate.setHours(0, 0, 0, 0);

    const isEventToday = eventDate.getTime() === currentDate.getTime();
    const timeDifference = eventDate - currentDate;
    const daysRemaining = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));

    const timerEl = document.createElement("div");
    timerEl.classList.add("timer");
    if (isEventToday) {
      timerEl.classList.add("today-timer");
      timerEl.style.borderColor = timer.color;
    }

    const settings = this.settingsManager.getCurrentSettings();
    timerEl.style.fontFamily = settings.displayFont;

    const daysString = Math.abs(daysRemaining) === 1 ?
      this.translations[settings.language].day :
      this.translations[settings.language].days;

    // Create header element
    const headerEl = document.createElement("h2");
    headerEl.className = isEventToday ? "today" : "days-remaining";

    if (isEventToday) {
      headerEl.textContent = this.translations[settings.language].today;
    } else {
      headerEl.textContent = daysRemaining;
      const daysLabelSpan = document.createElement("span");
      daysLabelSpan.className = "days-label";
      daysLabelSpan.textContent = daysString;
      headerEl.appendChild(daysLabelSpan);
    }

    // Create name element
    const nameEl = document.createElement("p");
    nameEl.className = "due-date";
    nameEl.style.color = timer.color;
    nameEl.textContent = timer.name;

    // Create location element if available
    let locationEl = null;
    if (timer.location) {
      locationEl = document.createElement("p");
      locationEl.className = "timer-location";
      locationEl.style.color = timer.color;

      if (timer.link) {
        // Create link if URL is provided
        const linkEl = document.createElement("a");
        linkEl.href = timer.link;
        linkEl.textContent = timer.location;
        linkEl.target = "_blank";
        linkEl.rel = "noopener noreferrer";
        locationEl.appendChild(linkEl);
      } else {
        // Just show location text
        locationEl.textContent = timer.location;
      }
    }

    // Create edit button
    const editBtn = document.createElement("button");
    editBtn.className = "edit-btn";
    let dateText = this.settingsManager.formatDate(timer.date);
    if (timer.time) {
      dateText += ` ${timer.time}`;
    }
    editBtn.textContent = dateText;
    editBtn.addEventListener("click", () => this.showModal(true, index));

    // Append elements
    timerEl.appendChild(headerEl);
    timerEl.appendChild(nameEl);
    if (locationEl) {
      timerEl.appendChild(locationEl);
    }
    timerEl.appendChild(editBtn);

    this.elements.timersContainer.appendChild(timerEl);
  }

  renderSidebarEvents() {
    const sidebarList = document.getElementById("events-list");
    sidebarList.innerHTML = "";

    const timers = this.timerManager.getTimers();
    timers.forEach((timer, index) => {
      const li = document.createElement("li");
      li.style.color = timer.color;
      li.setAttribute("data-date", new Date(timer.date).toLocaleDateString());
      li.classList.add(timer.showOnMainScreen ? "shown-on-main" : "not-shown-on-main");

      const eventNameSpan = document.createElement("span");
      let eventText = `${timer.name} - ${Math.ceil((new Date(timer.date) - new Date()) / (1000 * 60 * 60 * 24))} days`;
      if (timer.time) {
        eventText += ` (${timer.time})`;
      }
      eventNameSpan.textContent = eventText;

      // Add location if available
      if (timer.location) {
        const locationSpan = document.createElement("span");
        locationSpan.className = "sidebar-location";

        if (timer.link) {
          // Create link if URL is provided
          const linkEl = document.createElement("a");
          linkEl.href = timer.link;
          linkEl.textContent = timer.location;
          linkEl.target = "_blank";
          linkEl.rel = "noopener noreferrer";
          locationSpan.appendChild(linkEl);
        } else {
          // Just show location text
          locationSpan.textContent = timer.location;
        }

        // Add a line break and the location
        li.appendChild(document.createElement("br"));
        li.appendChild(locationSpan);
      }

      // if (timer.showOnMainScreen) {
      //   const checkmark = document.createTextNode("✔ ");
      //   li.appendChild(checkmark);
      // }

      li.appendChild(eventNameSpan);
      li.addEventListener("click", () => this.showModal(true, index));

      sidebarList.appendChild(li);
    });
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