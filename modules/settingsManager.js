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

  // Unsplash search functionality
  async searchUnsplashBackgrounds(query, page = 1, perPage = 12) {
    if (!query || typeof query !== 'string') {
      throw new Error('Search query is required');
    }

    try {
      // Try the official Unsplash API first
      const response = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}&orientation=landscape&client_id=YOUR_ACCESS_KEY`);

      if (response.ok) {
        const data = await response.json();
        return {
          results: data.results.map(photo => ({
            id: photo.id,
            name: photo.alt_description || photo.description || `${query} photo`,
            url: `${photo.urls.raw}&w=1920&h=1080&fit=crop&auto=format`,
            thumbnail: `${photo.urls.small}&w=300&h=200&fit=crop`,
            photographer: photo.user.name,
            photographerUrl: photo.user.links.html,
            unsplashUrl: photo.links.html
          })),
          total: data.total,
          totalPages: data.total_pages
        };
      }
    } catch (error) {
      console.warn('Unsplash API failed, using fallback:', error);
    }

    // Fallback to curated collections
    return this.getFallbackUnsplashResults(query, perPage);
  }

  getFallbackUnsplashResults(query, count = 12) {
    // Use curated photo collections that are known to work
    const photoCollections = {
      nature: [
        'photo-1506905925346-21bda4d32df4', 'photo-1441974231531-c6227db76b6e', 'photo-1507525428034-b723cf961d3e',
        'photo-1518837695005-2083093ee35b', 'photo-1506905925346-21bda4d32df4', 'photo-1470071459604-3b5ec3a7fe05',
        'photo-1501594907352-04cda38ebc29', 'photo-1506905925346-21bda4d32df4', 'photo-1441974231531-c6227db76b6e',
        'photo-1507525428034-b723cf961d3e', 'photo-1518837695005-2083093ee35b', 'photo-1470071459604-3b5ec3a7fe05'
      ],
      city: [
        'photo-1449824913935-59a10b8d2000', 'photo-1480714378408-67cf0d13bc1f', 'photo-1514565131-fce0801e5785',
        'photo-1477959858617-67f85cf4f1df', 'photo-1449824913935-59a10b8d2000', 'photo-1480714378408-67cf0d13bc1f',
        'photo-1514565131-fce0801e5785', 'photo-1477959858617-67f85cf4f1df', 'photo-1449824913935-59a10b8d2000',
        'photo-1480714378408-67cf0d13bc1f', 'photo-1514565131-fce0801e5785', 'photo-1477959858617-67f85cf4f1df'
      ],
      abstract: [
        'photo-1557672172-298e090bd0f1', 'photo-1558618666-fcd25c85cd64', 'photo-1557672172-298e090bd0f1',
        'photo-1558618666-fcd25c85cd64', 'photo-1557672172-298e090bd0f1', 'photo-1558618666-fcd25c85cd64',
        'photo-1557672172-298e090bd0f1', 'photo-1558618666-fcd25c85cd64', 'photo-1557672172-298e090bd0f1',
        'photo-1558618666-fcd25c85cd64', 'photo-1557672172-298e090bd0f1', 'photo-1558618666-fcd25c85cd64'
      ],
      space: [
        'photo-1446776877081-d282a0f896e2', 'photo-1446776653964-20c1d3a81b06', 'photo-1446776877081-d282a0f896e2',
        'photo-1446776653964-20c1d3a81b06', 'photo-1446776877081-d282a0f896e2', 'photo-1446776653964-20c1d3a81b06',
        'photo-1446776877081-d282a0f896e2', 'photo-1446776653964-20c1d3a81b06', 'photo-1446776877081-d282a0f896e2',
        'photo-1446776653964-20c1d3a81b06', 'photo-1446776877081-d282a0f896e2', 'photo-1446776653964-20c1d3a81b06'
      ],
      minimal: [
        'photo-1557672172-298e090bd0f1', 'photo-1558618666-fcd25c85cd64', 'photo-1557672172-298e090bd0f1',
        'photo-1558618666-fcd25c85cd64', 'photo-1557672172-298e090bd0f1', 'photo-1558618666-fcd25c85cd64',
        'photo-1557672172-298e090bd0f1', 'photo-1558618666-fcd25c85cd64', 'photo-1557672172-298e090bd0f1',
        'photo-1558618666-fcd25c85cd64', 'photo-1557672172-298e090bd0f1', 'photo-1558618666-fcd25c85cd64'
      ]
    };

    const queryLower = query.toLowerCase();
    const photoIds = photoCollections[queryLower] || photoCollections.nature;

    const results = [];
    for (let i = 0; i < count; i++) {
      const photoId = photoIds[i % photoIds.length];
      const variation = Math.floor(i / photoIds.length) + 1; // Add variation for repeated photos

      results.push({
        id: `${photoId}-${variation}`,
        name: `${query.charAt(0).toUpperCase() + query.slice(1)} ${i + 1}`,
        url: `https://images.unsplash.com/${photoId}?q=80&w=1920&h=1080&auto=format&fit=crop&v=${variation}`,
        thumbnail: `https://images.unsplash.com/${photoId}?q=80&w=300&h=200&auto=format&fit=crop&v=${variation}`,
        photographer: 'Unsplash',
        photographerUrl: 'https://unsplash.com',
        unsplashUrl: `https://unsplash.com/s/photos/${encodeURIComponent(query)}`
      });
    }

    return {
      results,
      total: results.length,
      totalPages: 1
    };
  }

  // Get popular search terms
  getPopularSearchTerms() {
    return [
      'nature', 'city', 'abstract', 'space', 'minimal',
      'landscape', 'architecture', 'ocean', 'mountain', 'forest',
      'sunset', 'clouds', 'desert', 'winter', 'autumn'
    ];
  }
}