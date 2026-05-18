export class SettingsManager {
  constructor() {
    const storedTimerScale = Number(localStorage.getItem("timerScale"));
    const defaultBackgroundImage = "https://images.unsplash.com/photo-1748178765097-1c012c848596?q=80&w=1828&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";
    const defaultDateColor = "#333333";
    const storedBackgroundImage = localStorage.getItem("backgroundImage");
    const migratedBackgroundImage = this.migrateLegacyBackgroundImage(
      storedBackgroundImage,
      defaultBackgroundImage
    );
    const storedDateColor = localStorage.getItem("dateColor");
    const dateColor = this.isValidColor(storedDateColor) ? storedDateColor : defaultDateColor;

    this.backgroundCacheName = "daywatch-background-cache-v1";
    this.userPhotosDbName = "daywatch-user-photos";
    this.userPhotosDbVersion = 1;
    this.userPhotosStoreName = "photos";
    this.userPhotoScheme = "userphoto://";
    this.maxUserPhotoBytes = 15 * 1024 * 1024;
    this.currentBackgroundObjectUrl = null;

    this.settings = {
      dateFormat: localStorage.getItem("dateFormat") || "long",
      displayFont: localStorage.getItem("displayFont") || "Roboto Condensed",
      language: localStorage.getItem("language") || "en",
      hideTimers: localStorage.getItem("hideTimers") === "true",
      timerScale: Number.isFinite(storedTimerScale) && storedTimerScale >= 70 && storedTimerScale <= 140
        ? storedTimerScale
        : 100,
      backgroundImage: migratedBackgroundImage,
      dateColor
    };

    if (storedBackgroundImage !== migratedBackgroundImage) {
      localStorage.setItem("backgroundImage", migratedBackgroundImage);
    }

    if (storedDateColor !== dateColor) {
      localStorage.setItem("dateColor", dateColor);
    }

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

  migrateLegacyBackgroundImage(storedBackgroundImage, defaultBackgroundImage) {
    if (typeof storedBackgroundImage !== 'string' || storedBackgroundImage.trim() === '') {
      return defaultBackgroundImage;
    }

    if (storedBackgroundImage.includes('source.unsplash.com')) {
      return defaultBackgroundImage;
    }

    return storedBackgroundImage;
  }

  isUserPhotoUrl(value) {
    return typeof value === 'string' && value.startsWith(this.userPhotoScheme);
  }

  getUserPhotoId(value) {
    return this.isUserPhotoUrl(value) ? value.slice(this.userPhotoScheme.length) : null;
  }

  isValidColor(value) {
    return typeof value === "string" && /^#(?:[0-9a-fA-F]{3}){1,2}$/.test(value);
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

    if (newSettings.timerScale !== undefined) {
      const scale = Number(newSettings.timerScale);
      if (!Number.isFinite(scale) || scale < 70 || scale > 140) {
        throw new Error('Invalid timer scale');
      }
      newSettings.timerScale = scale;
    }

    if (newSettings.dateColor !== undefined && !this.isValidColor(newSettings.dateColor)) {
      throw new Error("Invalid date color");
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
    const current = this.settings.backgroundImage;
    const presets = [];
    if (this.isRemoteBackgroundImage(current)) {
      presets.push({
        id: 'current',
        name: 'Current',
        url: current,
        thumbnail: current + '&w=300&h=200'
      });
    }
    return [
      ...presets,
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

    if (this.isUserPhotoUrl(imageUrl)) {
      void this.applyUserPhotoBackground(imageUrl);
      return;
    }

    this.releaseBackgroundObjectUrl();
    this.setBackgroundImage(imageUrl);
    void this.cacheBackgroundImage(imageUrl);
  }

  applyBackgroundImage() {
    const imageUrl = this.settings.backgroundImage;

    if (this.isUserPhotoUrl(imageUrl)) {
      void this.applyUserPhotoBackground(imageUrl);
      return;
    }

    if (!this.isRemoteBackgroundImage(imageUrl)) {
      this.releaseBackgroundObjectUrl();
      this.setBackgroundImage(imageUrl);
      return;
    }

    this.applyBackgroundFromCache(imageUrl);
  }

  async applyUserPhotoBackground(imageUrl) {
    const id = this.getUserPhotoId(imageUrl);
    if (!id) {
      return;
    }

    try {
      const photo = await this.getUserPhoto(id);
      if (!photo?.blob) {
        console.warn('User photo not found in storage:', id);
        return;
      }
      const objectUrl = URL.createObjectURL(photo.blob);
      this.setBackgroundImage(objectUrl, true);
    } catch (error) {
      console.warn('Failed to apply user photo background:', error);
    }
  }

  getCurrentBackgroundImage() {
    return this.settings.backgroundImage;
  }

  async applyBackgroundFromCache(imageUrl) {
    try {
      const cachedObjectUrl = await this.getCachedBackgroundObjectUrl(imageUrl);
      if (cachedObjectUrl) {
        this.setBackgroundImage(cachedObjectUrl, true);
        return;
      }
    } catch (error) {
      console.warn("Failed to load cached background image:", error);
    }

    this.releaseBackgroundObjectUrl();
    this.setBackgroundImage(imageUrl);
    void this.cacheBackgroundImage(imageUrl);
  }

  setBackgroundImage(imageUrl, isObjectUrl = false) {
    if (!document?.body?.style || !imageUrl) {
      return;
    }

    if (!isObjectUrl) {
      this.releaseBackgroundObjectUrl();
    } else if (this.currentBackgroundObjectUrl && this.currentBackgroundObjectUrl !== imageUrl) {
      URL.revokeObjectURL(this.currentBackgroundObjectUrl);
    }

    if (isObjectUrl) {
      this.currentBackgroundObjectUrl = imageUrl;
    }

    document.body.style.backgroundImage = `url(${imageUrl})`;
  }

  releaseBackgroundObjectUrl() {
    if (!this.currentBackgroundObjectUrl) {
      return;
    }

    if (typeof URL?.revokeObjectURL === "function") {
      URL.revokeObjectURL(this.currentBackgroundObjectUrl);
    }
    this.currentBackgroundObjectUrl = null;
  }

  isRemoteBackgroundImage(imageUrl) {
    return /^https?:\/\//i.test(imageUrl);
  }

  async cacheBackgroundImage(imageUrl) {
    if (!this.isRemoteBackgroundImage(imageUrl) || typeof caches === "undefined") {
      return;
    }

    try {
      const cache = await caches.open(this.backgroundCacheName);
      const cached = await cache.match(imageUrl);
      if (cached) {
        return;
      }

      const response = await fetch(imageUrl);
      if (!response.ok) {
        return;
      }

      await cache.put(imageUrl, response.clone());
    } catch (error) {
      console.warn("Failed to cache background image:", error);
    }
  }

  async getCachedBackgroundObjectUrl(imageUrl) {
    if (typeof caches === "undefined") {
      return null;
    }

    const cache = await caches.open(this.backgroundCacheName);
    const cachedResponse = await cache.match(imageUrl);
    if (!cachedResponse) {
      return null;
    }

    const blob = await cachedResponse.blob();
    if (!blob || blob.size === 0) {
      return null;
    }

    if (typeof URL?.createObjectURL !== "function") {
      return null;
    }

    return URL.createObjectURL(blob);
  }

  // Unsplash search functionality
  async searchUnsplashBackgrounds(query, page = 1, perPage = 12) {
    if (!query || typeof query !== 'string') {
      throw new Error('Search query is required');
    }

    const accessKey = localStorage.getItem('unsplashAccessKey');
    const canUseOfficialApi = accessKey && accessKey !== 'YOUR_ACCESS_KEY';

    try {
      // Try the official Unsplash API first when an access key is available.
      if (canUseOfficialApi) {
        const response = await fetch(
          `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}&orientation=landscape`,
          {
            headers: {
              Authorization: `Client-ID ${accessKey}`,
              'Accept-Version': 'v1'
            }
          }
        );

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
      }
    } catch (error) {
      console.warn('Unsplash API failed, using fallback:', error);
    }

    try {
      // If no API key is configured, use Unsplash web search endpoint.
      const response = await fetch(
        `https://unsplash.com/napi/search/photos?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}`
      );

      if (response.ok) {
        const data = await response.json();
        return {
          results: (data.results || [])
            .filter((photo) => photo?.urls?.raw && photo?.urls?.small)
            .map((photo) => ({
              id: photo.id,
              name: photo.alt_description || photo.description || `${query} photo`,
              url: `${photo.urls.raw}&w=1920&h=1080&fit=crop&auto=format`,
              thumbnail: `${photo.urls.small}&w=480&h=320&fit=crop&auto=format`,
              photographer: photo.user?.name || 'Unsplash',
              photographerUrl: photo.user?.links?.html || 'https://unsplash.com',
              unsplashUrl: photo.links?.html || 'https://unsplash.com'
            })),
          total: data.total || 0,
          totalPages: data.total_pages || 0
        };
      }
    } catch (error) {
      console.warn('Unsplash public search failed, using curated fallback:', error);
    }

    // Fallback to curated Unsplash image IDs when no API key is configured.
    return this.getFallbackUnsplashResults(query, perPage, page);
  }

  getFallbackUnsplashResults(query, count = 12, page = 1) {
    const normalizedQuery = (query || 'nature').trim().toLowerCase();
    const querySlug = encodeURIComponent(normalizedQuery || 'nature');

    const photoLibrary = {
      nature: [
        'photo-1506905925346-21bda4d32df4',
        'photo-1441974231531-c6227db76b6e',
        'photo-1507525428034-b723cf961d3e',
        'photo-1518837695005-2083093ee35b',
        'photo-1470071459604-3b5ec3a7fe05',
        'photo-1501594907352-04cda38ebc29',
        'photo-1501785888041-af3ef285b470',
        'photo-1464822759023-fed622ff2c3b',
        'photo-1501854140801-50d01698950b',
        'photo-1472214103451-9374bd1c798e'
      ],
      city: [
        'photo-1449824913935-59a10b8d2000',
        'photo-1519501025264-65ba15a82390',
        'photo-1514565131-fce0801e5785',
        'photo-1477959858617-67f85cf4f1df',
        'photo-1467269204594-9661b134dd2b',
        'photo-1477959858617-67f85cf4f1df',
        'photo-1512453979798-5ea266f8880c',
        'photo-1519608487953-e999c86e7455'
      ],
      abstract: [
        'photo-1557672172-298e090bd0f1',
        'photo-1558618666-fcd25c85cd64',
        'photo-1508615039623-a25605d2b022',
        'photo-1465101046530-73398c7f28ca',
        'photo-1513151233558-d860c5398176',
        'photo-1550684848-fac1c5b4e853'
      ],
      space: [
        'photo-1446776877081-d282a0f896e2',
        'photo-1446776653964-20c1d3a81b06',
        'photo-1462331940025-496dfbfc7564',
        'photo-1502134249126-9f3755a50d78',
        'photo-1451187580459-43490279c0fa'
      ],
      minimal: [
        'photo-1498050108023-c5249f4df085',
        'photo-1497215842964-222b430dc094',
        'photo-1497366811353-6870744d04b2',
        'photo-1531297484001-80022131f5a1',
        'photo-1525547719571-a2d4ac8945e2'
      ]
    };

    const keywordsToCategory = [
      { keywords: ['city', 'urban', 'street', 'building', 'architecture'], category: 'city' },
      { keywords: ['abstract', 'gradient', 'texture', 'pattern'], category: 'abstract' },
      { keywords: ['space', 'galaxy', 'stars', 'cosmos', 'planet'], category: 'space' },
      { keywords: ['minimal', 'clean', 'simple', 'white'], category: 'minimal' },
      { keywords: ['nature', 'forest', 'mountain', 'ocean', 'landscape', 'sunset'], category: 'nature' }
    ];

    const matchedCategory = keywordsToCategory.find(({ keywords }) =>
      keywords.some((keyword) => normalizedQuery.includes(keyword))
    )?.category || 'nature';

    const generalPool = [
      ...photoLibrary.nature,
      ...photoLibrary.city,
      ...photoLibrary.abstract,
      ...photoLibrary.space,
      ...photoLibrary.minimal
    ];

    const primaryPool = photoLibrary[matchedCategory] || photoLibrary.nature;
    const candidatePool = Array.from(new Set([...primaryPool, ...generalPool]));

    const seed = `${normalizedQuery}-${page}-${Date.now()}`;
    const shuffledPool = [...candidatePool]
      .map((photoId, index) => ({
        photoId,
        sort: this.simpleHash(`${seed}-${photoId}-${index}`)
      }))
      .sort((a, b) => a.sort - b.sort)
      .map((entry) => entry.photoId);

    const results = [];
    for (let i = 0; i < count; i++) {
      const photoId = shuffledPool[i % shuffledPool.length];
      const variation = `${page}-${i}`;

      results.push({
        id: `fallback-${photoId}-${variation}`,
        name: `${normalizedQuery.charAt(0).toUpperCase() + normalizedQuery.slice(1)} ${i + 1}`,
        url: `https://images.unsplash.com/${photoId}?q=80&w=1920&h=1080&auto=format&fit=crop&v=${variation}`,
        thumbnail: `https://images.unsplash.com/${photoId}?q=80&w=480&h=320&auto=format&fit=crop&v=${variation}`,
        photographer: 'Unsplash',
        photographerUrl: 'https://unsplash.com',
        unsplashUrl: `https://unsplash.com/s/photos/${querySlug}`
      });
    }

    return {
      results,
      total: 2000,
      totalPages: 167
    };
  }

  simpleHash(input) {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
    }
    return hash;
  }

  // User photo storage (IndexedDB)
  openUserPhotosDb() {
    if (this.userPhotosDbPromise) {
      return this.userPhotosDbPromise;
    }

    this.userPhotosDbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB is not available'));
        return;
      }

      const request = indexedDB.open(this.userPhotosDbName, this.userPhotosDbVersion);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.userPhotosStoreName)) {
          const store = db.createObjectStore(this.userPhotosStoreName, { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt');
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.userPhotosDbPromise;
  }

  async runUserPhotoTransaction(mode, callback) {
    const db = await this.openUserPhotosDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.userPhotosStoreName, mode);
      const store = tx.objectStore(this.userPhotosStoreName);
      let result;
      try {
        result = callback(store);
      } catch (error) {
        reject(error);
        return;
      }
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  generateUserPhotoId() {
    if (typeof crypto?.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `photo-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  async addUserPhoto(file) {
    if (!(file instanceof Blob)) {
      throw new Error('Invalid file');
    }
    if (file.type && !file.type.startsWith('image/')) {
      throw new Error('File is not an image');
    }
    if (file.size > this.maxUserPhotoBytes) {
      const maxMb = Math.round(this.maxUserPhotoBytes / (1024 * 1024));
      throw new Error(`Image is larger than ${maxMb} MB`);
    }

    const record = {
      id: this.generateUserPhotoId(),
      name: (file.name || 'Uploaded photo').slice(0, 200),
      blob: file,
      type: file.type || 'image/jpeg',
      size: file.size,
      createdAt: Date.now()
    };

    await this.runUserPhotoTransaction('readwrite', (store) => {
      store.put(record);
    });

    return record;
  }

  async listUserPhotos() {
    try {
      const db = await this.openUserPhotosDb();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(this.userPhotosStoreName, 'readonly');
        const store = tx.objectStore(this.userPhotosStoreName);
        const request = store.getAll();
        request.onsuccess = () => {
          const photos = (request.result || []).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          resolve(photos);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.warn('Failed to list user photos:', error);
      return [];
    }
  }

  async getUserPhoto(id) {
    if (!id) {
      return null;
    }
    const db = await this.openUserPhotosDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.userPhotosStoreName, 'readonly');
      const store = tx.objectStore(this.userPhotosStoreName);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteUserPhoto(id) {
    if (!id) {
      return;
    }
    await this.runUserPhotoTransaction('readwrite', (store) => {
      store.delete(id);
    });
  }

  buildUserPhotoUrl(id) {
    return `${this.userPhotoScheme}${id}`;
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
