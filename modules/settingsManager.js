export class SettingsManager {
  constructor() {
    this.settings = {
      dateFormat: localStorage.getItem("dateFormat") || "long",
      displayFont: localStorage.getItem("displayFont") || "Roboto Condensed",
      language: localStorage.getItem("language") || "en",
      hideTimers: localStorage.getItem("hideTimers") === "true",
      backgroundImage: localStorage.getItem("backgroundImage") || "https://images.unsplash.com/photo-1748178765097-1c012c848596?q=80&w=1828&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
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

  // Background-related methods
  getBackgroundOptions() {
    return [
      {
        id: 'current',
        name: 'Current',
        url: this.settings.backgroundImage,
        thumbnail: this.settings.backgroundImage + '&w=300&h=200'
      },
      {
        id: 'nature1',
        name: 'Mountain Lake',
        url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=1828&auto=format&fit=crop',
        thumbnail: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=300&h=200&auto=format&fit=crop'
      },
      {
        id: 'nature2',
        name: 'Forest Path',
        url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1828&auto=format&fit=crop',
        thumbnail: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=300&h=200&auto=format&fit=crop'
      },
      {
        id: 'nature3',
        name: 'Ocean Sunset',
        url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1828&auto=format&fit=crop',
        thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=300&h=200&auto=format&fit=crop'
      },
      {
        id: 'city1',
        name: 'City Skyline',
        url: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?q=80&w=1828&auto=format&fit=crop',
        thumbnail: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?q=80&w=300&h=200&auto=format&fit=crop'
      },
      {
        id: 'abstract1',
        name: 'Abstract Colors',
        url: 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?q=80&w=1828&auto=format&fit=crop',
        thumbnail: 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?q=80&w=300&h=200&auto=format&fit=crop'
      },
      {
        id: 'space1',
        name: 'Galaxy',
        url: 'https://images.unsplash.com/photo-1446776877081-d282a0f896e2?q=80&w=1828&auto=format&fit=crop',
        thumbnail: 'https://images.unsplash.com/photo-1446776877081-d282a0f896e2?q=80&w=300&h=200&auto=format&fit=crop'
      }
    ];
  }

  updateBackgroundImage(imageUrl) {
    if (!imageUrl || typeof imageUrl !== 'string') {
      throw new Error('Invalid background image URL');
    }

    this.settings.backgroundImage = imageUrl;
    localStorage.setItem('backgroundImage', imageUrl);
    this.applyBackgroundImage();
  }

  applyBackgroundImage() {
    document.body.style.backgroundImage = `url(${this.settings.backgroundImage})`;
  }

  getCurrentBackgroundImage() {
    return this.settings.backgroundImage;
  }
}