export class SettingsManager {
  constructor() {
    this.settings = {
      dateFormat: localStorage.getItem("dateFormat") || "long",
      displayFont: localStorage.getItem("displayFont") || "Roboto Condensed",
      language: localStorage.getItem("language") || "en",
      hideTimers: localStorage.getItem("hideTimers") === "true"
    };

    this.dateFormatOptions = {
      long: {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      },
      short: {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric"
      },
      full: {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      }
    };
  }

  updateSettings(newSettings) {
    // Input validation
    if (!newSettings || typeof newSettings !== 'object') {
      throw new Error('Invalid settings object');
    }

    const validDateFormats = ['long', 'short', 'full'];
    if (newSettings.dateFormat && !validDateFormats.includes(newSettings.dateFormat)) {
      throw new Error('Invalid date format');
    }

    // Update only valid settings
    Object.entries(newSettings).forEach(([key, value]) => {
      if (this.settings.hasOwnProperty(key)) {
        this.settings[key] = value;
        localStorage.setItem(key, value.toString());
      }
    });
  }

  getDateFormatOptions() {
    return { ...this.dateFormatOptions };
  }

  formatDate(date) {
    if (!(date instanceof Date) && typeof date !== 'number') {
      throw new Error('Invalid date');
    }

    try {
      return new Date(date).toLocaleDateString(
        this.settings.language,
        this.dateFormatOptions[this.settings.dateFormat]
      );
    } catch (error) {
      console.error('Date formatting error:', error);
      return new Date(date).toISOString().split('T')[0];
    }
  }

  getCurrentSettings() {
    return { ...this.settings };
  }

  toggleTimerVisibility() {
    this.settings.hideTimers = !this.settings.hideTimers;
    localStorage.setItem("hideTimers", this.settings.hideTimers.toString());
    return this.settings.hideTimers;
  }

  getDateFormatOptionsForLanguage() {
    const today = new Date();
    return Object.entries(this.dateFormatOptions).map(([key, options]) => ({
      value: key,
      label: today.toLocaleDateString(this.settings.language, options)
    }));
  }

  // Font-related methods
  getAvailableFonts() {
    return [
      "Roboto Condensed",
      "Arial",
      "Helvetica",
      "Times New Roman",
      "Courier New"
    ];
  }

  // Language-related methods
  getAvailableLanguages() {
    return [
      { code: "en", name: "English" },
      { code: "ja", name: "日本語" },
      { code: "es", name: "Español" },
      { code: "zh", name: "中文" }
    ];
  }

  getCurrentLanguage() {
    return this.settings.language;
  }
}