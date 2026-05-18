import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SettingsManager } from '../modules/settingsManager.js';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock document.body for background image testing
Object.defineProperty(document, 'body', {
  value: {
    style: {}
  },
  writable: true
});

describe('SettingsManager', () => {
  let settingsManager;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    settingsManager = new SettingsManager();
  });

  describe('constructor', () => {
    it('should initialize with default settings', () => {
      const settings = settingsManager.getCurrentSettings();

      expect(settings.dateFormat).toBe('long');
      expect(settings.displayFont).toBe('Roboto Condensed');
      expect(settings.language).toBe('en');
      expect(settings.hideTimers).toBe(false);
      expect(settings.timerScale).toBe(100);
      expect(settings.dateColor).toBe('#333333');
      expect(settings.backgroundImage).toContain('unsplash.com');
    });

    it('should migrate legacy source.unsplash.com background URLs', () => {
      const legacyUrl = 'https://source.unsplash.com/random/1920x1080?nature';

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'backgroundImage') {
          return legacyUrl;
        }
        return null;
      });

      settingsManager = new SettingsManager();
      const settings = settingsManager.getCurrentSettings();

      expect(settings.backgroundImage).not.toContain('source.unsplash.com');
      expect(settings.backgroundImage).toContain('images.unsplash.com');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('backgroundImage', settings.backgroundImage);
    });
  });

  describe('timer scale setting', () => {
    it('should persist valid timer scale', () => {
      settingsManager.updateSettings({ timerScale: 125 });

      expect(settingsManager.getCurrentSettings().timerScale).toBe(125);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('timerScale', '125');
    });

    it('should reject invalid timer scale', () => {
      expect(() => {
        settingsManager.updateSettings({ timerScale: 20 });
      }).toThrow('Invalid timer scale');
    });
  });

  describe('date color setting', () => {
    it('should persist valid date color', () => {
      settingsManager.updateSettings({ dateColor: '#112233' });

      expect(settingsManager.getCurrentSettings().dateColor).toBe('#112233');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('dateColor', '#112233');
    });

    it('should reject invalid date color', () => {
      expect(() => {
        settingsManager.updateSettings({ dateColor: 'blue' });
      }).toThrow('Invalid date color');
    });
  });

  describe('background image functionality', () => {
    it('should return background options', () => {
      const options = settingsManager.getBackgroundOptions();

      expect(Array.isArray(options)).toBe(true);
      expect(options.length).toBeGreaterThan(0);
      expect(options[0]).toHaveProperty('id');
      expect(options[0]).toHaveProperty('name');
      expect(options[0]).toHaveProperty('url');
      expect(options[0]).toHaveProperty('thumbnail');
    });

    it('should update background image', () => {
      const newUrl = 'https://example.com/new-background.jpg';

      settingsManager.updateBackgroundImage(newUrl);

      expect(settingsManager.getCurrentBackgroundImage()).toBe(newUrl);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('backgroundImage', newUrl);
    });

    it('should throw error for invalid background URL', () => {
      expect(() => {
        settingsManager.updateBackgroundImage('');
      }).toThrow('Invalid background image URL');

      expect(() => {
        settingsManager.updateBackgroundImage(null);
      }).toThrow('Invalid background image URL');
    });

    it('should get current background image', () => {
      const currentBg = settingsManager.getCurrentBackgroundImage();
      expect(typeof currentBg).toBe('string');
      expect(currentBg.length).toBeGreaterThan(0);
    });

    it('should apply background image to document body', () => {
      const testUrl = 'https://example.com/test.jpg';

      settingsManager.updateBackgroundImage(testUrl);

      expect(document.body.style.backgroundImage).toBe(`url(${testUrl})`);
    });
  });

  describe('Unsplash search functionality', () => {
    beforeEach(() => {
      // Mock fetch for Unsplash API
      global.fetch = vi.fn();
    });

    it('should use query-driven Unsplash public search when no API key is configured', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          total: 1,
          total_pages: 1,
          results: [
            {
              id: 'photo-1',
              alt_description: 'mountain view',
              description: null,
              urls: {
                raw: 'https://images.unsplash.com/photo-123?ixid=test',
                small: 'https://images.unsplash.com/photo-123-small?ixid=test'
              },
              user: {
                name: 'Photographer',
                links: { html: 'https://unsplash.com/@photographer' }
              },
              links: { html: 'https://unsplash.com/photos/photo-1' }
            }
          ]
        })
      });

      const results = await settingsManager.searchUnsplashBackgrounds('mountain');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://unsplash.com/napi/search/photos?query=mountain')
      );
      expect(results.results[0].id).toBe('photo-1');
      expect(results.results[0].name).toBe('mountain view');
    });

    it('should return fallback results when API fails', async () => {
      global.fetch.mockRejectedValue(new Error('API Error'));

      const results = await settingsManager.searchUnsplashBackgrounds('nature');

      expect(results).toHaveProperty('results');
      expect(results).toHaveProperty('total');
      expect(results).toHaveProperty('totalPages');
      expect(Array.isArray(results.results)).toBe(true);
      expect(results.results.length).toBeGreaterThan(0);
    });

    it('should throw error for invalid query', async () => {
      await expect(settingsManager.searchUnsplashBackgrounds('')).rejects.toThrow('Search query is required');
      await expect(settingsManager.searchUnsplashBackgrounds(null)).rejects.toThrow('Search query is required');
    });

    it('should return popular search terms', () => {
      const terms = settingsManager.getPopularSearchTerms();

      expect(Array.isArray(terms)).toBe(true);
      expect(terms.length).toBeGreaterThan(0);
      expect(terms).toContain('nature');
      expect(terms).toContain('city');
    });

    it('should generate fallback results for different queries', () => {
      const natureResults = settingsManager.getFallbackUnsplashResults('nature', 5);
      const cityResults = settingsManager.getFallbackUnsplashResults('city', 5);

      expect(natureResults.results).toHaveLength(5);
      expect(cityResults.results).toHaveLength(5);

      // Results should have required properties
      natureResults.results.forEach(result => {
        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('name');
        expect(result).toHaveProperty('url');
        expect(result).toHaveProperty('thumbnail');
        expect(result).toHaveProperty('photographer');
      });
    });
  });
});
