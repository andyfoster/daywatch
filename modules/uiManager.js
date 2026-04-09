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
      timerSizeRange: document.getElementById("timer-size-range"),
      timerSizeValue: document.getElementById("timer-size-value"),
      // Other elements
      modalTitle: document.getElementById("modal-title"),
      removeBtn: document.getElementById("remove-timer-btn")
    };

    this.initializeEventListeners();
    this.setupPrivacyShield();
    this.applyTimerScale(this.settingsManager.getCurrentSettings().timerScale);
  }

  getImageFallbackUrl() {
    return 'images/hans-joachim-kaiser-2msFqISyGUU-unsplash.jpg';
  }

  applyImageFallback(img) {
    img.addEventListener('error', () => {
      if (img.dataset.fallbackApplied === 'true') {
        return;
      }

      img.dataset.fallbackApplied = 'true';
      img.src = this.getImageFallbackUrl();
    });
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
    document.getElementById("import-timers-btn").addEventListener("click", () => this.showImportModal());

    // Mass delete timers
    document.getElementById("mass-delete-btn").addEventListener("click", () => this.showMassDeleteModal());
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
        timerScale: this.getTimerScaleValue()
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
        this.populateBackgroundOptions();
        this.populateCurrentSettings();
        if (!this.unsplashSearchInitialized) {
          this.setupUnsplashSearch();
          this.unsplashSearchInitialized = true;
        }
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
    if (this.sidebarManager.isOpen()) {
      this.sidebarManager.hide();
    }

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
    // Set up file upload
    this.setupFileUpload();

    // Set up text import
    this.setupTextImport();

    // Set up preview and import buttons
    document.getElementById('preview-import-btn').addEventListener('click', () => this.previewImport());
    document.getElementById('confirm-import-btn').addEventListener('click', () => this.confirmImport());
  }

  resetImportModal() {
    // Reset tab to Upload File
    const fileTab = document.querySelector('.import-tab[data-bs-target="#file-import"]');
    if (fileTab) {
      this.showBootstrapTab(fileTab);
    }

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
      const textTab = document.querySelector('.import-tab[data-bs-target="#text-import"]');
      if (textTab) {
        this.showBootstrapTab(textTab);
      }
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

  showBootstrapTab(tabButton) {
    if (!tabButton) {
      return;
    }

    if (window.bootstrap?.Tab) {
      const instance = window.bootstrap.Tab.getOrCreateInstance(tabButton);
      instance.show();
    } else {
      tabButton.click();
    }
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

      const nameStrong = document.createElement('strong');
      nameStrong.textContent = timer.name;

      const detailsSmall = document.createElement('small');
      detailsSmall.textContent = `${date}${timeStr}${locationStr}`;

      timerDiv.appendChild(nameStrong);
      timerDiv.appendChild(document.createElement('br'));
      timerDiv.appendChild(detailsSmall);

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
    const { isEventToday, daysRemaining, weekdaysRemaining } = this.calculateTimerData(timer);
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
    const weekdayCountEl = ElementFactory.createWeekdayCount(weekdaysRemaining, timer.color);
    const locationEl = ElementFactory.createLocationElement(timer);
    const linkEl = ElementFactory.createLinkElement(timer);
    const editBtn = ElementFactory.createEditButton(timer, index, this.showTimerModal.bind(this), this.settingsManager);

    // Append elements
    timerEl.appendChild(headerEl);
    timerEl.appendChild(nameEl);
    timerEl.appendChild(weekdayCountEl);
    if (locationEl) {
      timerEl.appendChild(locationEl);
    }
    if (linkEl) {
      timerEl.appendChild(linkEl);
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
    const weekdaysRemaining = this.calculateWeekdaysDifference(currentDate, eventDate);

    return { isEventToday, daysRemaining, weekdaysRemaining };
  }

  calculateWeekdaysDifference(startDate, endDate) {
    const direction = endDate >= startDate ? 1 : -1;
    const cursor = new Date(startDate);
    let weekdays = 0;

    while (cursor.getTime() !== endDate.getTime()) {
      cursor.setDate(cursor.getDate() + direction);
      const dayOfWeek = cursor.getDay();
      const isWeekday = dayOfWeek !== 0 && dayOfWeek !== 6;
      if (isWeekday) {
        weekdays += direction;
      }
    }

    return weekdays;
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

    const row = document.createElement("div");
    row.className = "sidebar-event-row";

    const visibilityCheckbox = document.createElement("input");
    visibilityCheckbox.type = "checkbox";
    visibilityCheckbox.className = "sidebar-visibility-checkbox form-check-input";
    visibilityCheckbox.checked = Boolean(timer.showOnMainScreen);
    visibilityCheckbox.setAttribute("aria-label", `Show ${timer.name} on main screen`);

    visibilityCheckbox.addEventListener("click", (event) => {
      event.stopPropagation();
    });

    visibilityCheckbox.addEventListener("change", (event) => {
      event.stopPropagation();
      this.timerManager.setTimerVisibility(index, visibilityCheckbox.checked);
      this.renderTimers();
    });

    // Create event text
    const eventDetails = ElementFactory.createSidebarEventText(timer);
    row.appendChild(visibilityCheckbox);
    row.appendChild(eventDetails);
    li.appendChild(row);

    // Add location if available
    const locationEl = ElementFactory.createLocationElement(timer, "sidebar-location");
    if (locationEl) {
      li.appendChild(locationEl);
    }

    // Add link icon if available (but no location)
    const linkEl = ElementFactory.createLinkElement(timer, "sidebar-link");
    if (linkEl) {
      li.appendChild(document.createTextNode(" "));
      li.appendChild(linkEl);
    }

    // Add click handler
    li.addEventListener("click", (event) => {
      if (event.target.closest("a") || event.target.closest(".sidebar-visibility-checkbox")) {
        return;
      }

      this.showTimerModal(true, index);
    });

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

  populateBackgroundOptions() {
    const container = document.getElementById('background-selection');
    container.innerHTML = '';

    const backgrounds = this.settingsManager.getBackgroundOptions();
    const currentBackground = this.settingsManager.getCurrentBackgroundImage();

    backgrounds.forEach(bg => {
      const option = document.createElement('div');
      option.className = 'background-option';
      option.dataset.backgroundUrl = bg.url;

      if (bg.url === currentBackground) {
        option.classList.add('selected');
      }

      const img = document.createElement('img');
      img.src = bg.thumbnail;
      img.alt = bg.name;
      img.loading = 'lazy';
      this.applyImageFallback(img);

      const name = document.createElement('div');
      name.className = 'background-name';
      name.textContent = bg.name;

      option.appendChild(img);
      option.appendChild(name);

      option.addEventListener('click', () => {
        // Remove selected class from all options
        container.querySelectorAll('.background-option').forEach(opt => {
          opt.classList.remove('selected');
        });

        // Add selected class to clicked option
        option.classList.add('selected');

        // Update background immediately
        this.settingsManager.updateBackgroundImage(bg.url);
      });

      container.appendChild(option);
    });
  }

  populateCurrentSettings() {
    const settings = this.settingsManager.getCurrentSettings();
    document.getElementById("date-format-select").value = settings.dateFormat;
    document.getElementById("display-font").value = settings.displayFont;
    document.getElementById("language").value = settings.language;
    if (this.elements.timerSizeRange) {
      this.elements.timerSizeRange.value = settings.timerScale || 100;
      this.updateTimerSizeDisplay(settings.timerScale || 100);
      this.applyTimerScale(settings.timerScale || 100);
    }
  }

  // Unsplash search functionality
  setupUnsplashSearch() {
    const searchInput = document.getElementById('unsplash-search-input');
    const searchBtn = document.getElementById('unsplash-search-btn');
    const suggestionBtns = document.querySelectorAll('.suggestion-btn');

    // Search button click
    searchBtn.addEventListener('click', () => {
      const query = searchInput.value.trim();
      if (query) {
        this.searchUnsplashBackgrounds(query);
      }
    });

    // Enter key in search input
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        if (query) {
          this.searchUnsplashBackgrounds(query);
        }
      }
    });

    // Suggestion buttons
    suggestionBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const query = btn.dataset.query;
        searchInput.value = query;
        this.searchUnsplashBackgrounds(query);
      });
    });
  }

  async searchUnsplashBackgrounds(query) {
    const resultsContainer = document.getElementById('unsplash-results');
    const loadingIndicator = document.getElementById('unsplash-loading');

    try {
      // Show loading
      loadingIndicator.style.display = 'block';
      resultsContainer.innerHTML = '';

      // Search Unsplash
      const searchResults = await this.settingsManager.searchUnsplashBackgrounds(query);

      // Hide loading
      loadingIndicator.style.display = 'none';

      // Display results
      this.displayUnsplashResults(searchResults.results);

    } catch (error) {
      loadingIndicator.style.display = 'none';
      this.showError(`Failed to search backgrounds: ${error.message}`);

      this.renderSearchPlaceholder(
        resultsContainer,
        'Search failed',
        'Please try again or use the preset backgrounds'
      );
    }
  }

  displayUnsplashResults(results) {
    const container = document.getElementById('unsplash-results');

    if (results.length === 0) {
      this.renderSearchPlaceholder(
        container,
        'No results found',
        'Try a different search term'
      );
      return;
    }

    container.innerHTML = '';

    results.forEach(photo => {
      const option = document.createElement('div');
      option.className = 'background-option';
      option.dataset.backgroundUrl = photo.url;

      const img = document.createElement('img');
      img.src = photo.thumbnail;
      img.alt = photo.name;
      img.loading = 'lazy';
      this.applyImageFallback(img);

      const name = document.createElement('div');
      name.className = 'background-name';
      name.textContent = photo.name;

      option.appendChild(img);
      option.appendChild(name);

      option.addEventListener('click', () => {
        // Remove selected class from all background options (both preset and search)
        document.querySelectorAll('.background-option').forEach(opt => {
          opt.classList.remove('selected');
        });

        // Add selected class to clicked option
        option.classList.add('selected');

        // Update background immediately
        this.settingsManager.updateBackgroundImage(photo.url);

        // Show success notification
        this.showNotification(`Background updated to "${photo.name}"`, 'success');
      });

      container.appendChild(option);
    });

    // Add Unsplash attribution
    const attribution = document.createElement('div');
    attribution.className = 'unsplash-attribution';
    attribution.appendChild(document.createTextNode('Photos from '));

    const link = document.createElement('a');
    link.href = 'https://unsplash.com';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Unsplash';

    attribution.appendChild(link);
    container.appendChild(attribution);
  }

  renderSearchPlaceholder(container, title, hint) {
    container.innerHTML = '';

    const placeholder = document.createElement('div');
    placeholder.className = 'search-placeholder';

    const titleEl = document.createElement('p');
    titleEl.textContent = title;

    const hintEl = document.createElement('p');
    hintEl.className = 'search-hint';
    hintEl.textContent = hint;

    placeholder.appendChild(titleEl);
    placeholder.appendChild(hintEl);
    container.appendChild(placeholder);
  }

  // Bulk actions functionality
  showMassDeleteModal() {
    if (this.sidebarManager.isOpen()) {
      this.sidebarManager.hide();
    }

    this.modalManager.showModal("mass-delete-modal", {
      setup: () => {
        this.populateTimerSelectionList();
        if (!this.massActionsInitialized) {
          this.setupMassDeleteEventListeners();
          this.massActionsInitialized = true;
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
      nameSpan.style.color = timer.color;

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

  setupMassDeleteEventListeners() {
    const selectAllCheckbox = document.getElementById('select-all-timers');
    const timerSelectionList = document.getElementById('timer-selection-list');
    const confirmBtn = document.getElementById('confirm-mass-delete-btn');
    const hideBtn = document.getElementById('confirm-mass-hide-btn');
    const cancelBtn = document.getElementById('cancel-mass-delete-btn');

    if (!selectAllCheckbox || !timerSelectionList || !confirmBtn || !cancelBtn) {
      return;
    }

    // Select all functionality
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

    // Quick filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const filter = btn.dataset.filter;
        this.applyQuickFilter(filter);
      });
    });

    // Confirm delete
    confirmBtn.addEventListener('click', () => {
      this.confirmMassDelete();
    });

    // Confirm hide
    if (hideBtn) {
      hideBtn.addEventListener('click', () => {
        this.confirmMassHide();
      });
    }

    // Cancel
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
    this.renderTimers();
    this.showNotification(`Successfully hid ${updatedCount} timer${updatedCount !== 1 ? 's' : ''}`, 'success');
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
      this.renderTimers();
      this.showNotification(`Successfully deleted ${indices.length} timer${indices.length !== 1 ? 's' : ''}`, 'success');
    }
  }
}
