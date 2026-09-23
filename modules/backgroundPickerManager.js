export class BackgroundPickerManager {
  constructor(settingsManager, notificationManager) {
    this.settingsManager = settingsManager;
    this.notificationManager = notificationManager;
    this.unsplashSearchInitialized = false;
    this.userPhotosInitialized = false;
    this.userPhotoThumbnailUrls = new Map();
  }

  // Called each time the settings modal is opened
  initialize() {
    this.populateBackgroundOptions();
    if (!this.unsplashSearchInitialized) {
      this.setupUnsplashSearch();
      this.unsplashSearchInitialized = true;
    }
    if (!this.userPhotosInitialized) {
      this.setupUserPhotosTab();
      this.userPhotosInitialized = true;
    }
    void this.populateUserPhotos();
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
        container.querySelectorAll('.background-option').forEach(opt => {
          opt.classList.remove('selected');
        });

        option.classList.add('selected');

        this.settingsManager.updateBackgroundImage(bg.url);
      });

      container.appendChild(option);
    });
  }

  // Unsplash search functionality
  setupUnsplashSearch() {
    const searchInput = document.getElementById('unsplash-search-input');
    const searchBtn = document.getElementById('unsplash-search-btn');
    const suggestionBtns = document.querySelectorAll('.suggestion-btn');

    searchBtn.addEventListener('click', () => {
      const query = searchInput.value.trim();
      if (query) {
        this.searchUnsplashBackgrounds(query);
      }
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        const query = searchInput.value.trim();
        if (query) {
          this.searchUnsplashBackgrounds(query);
        }
      }
    });

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
      loadingIndicator.style.display = 'block';
      resultsContainer.innerHTML = '';

      const searchResults = await this.settingsManager.searchUnsplashBackgrounds(query);

      loadingIndicator.style.display = 'none';

      this.displayUnsplashResults(searchResults.results);
    } catch (error) {
      loadingIndicator.style.display = 'none';
      this.notificationManager.error(`Failed to search backgrounds: ${error.message}`);

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
        document.querySelectorAll('.background-option').forEach(opt => {
          opt.classList.remove('selected');
        });

        option.classList.add('selected');

        this.settingsManager.updateBackgroundImage(photo.url);

        this.notificationManager.show(`Background updated to "${photo.name}"`, 'success');
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

  // User-uploaded photos
  setupUserPhotosTab() {
    const input = document.getElementById('user-photo-input');
    if (!input) {
      return;
    }

    input.addEventListener('change', async (event) => {
      const files = Array.from(event.target.files || []);
      event.target.value = '';
      if (files.length === 0) {
        return;
      }
      await this.handleUserPhotoUploads(files);
    });
  }

  async handleUserPhotoUploads(files) {
    let lastAdded = null;
    let successCount = 0;

    for (const file of files) {
      try {
        lastAdded = await this.settingsManager.addUserPhoto(file);
        successCount += 1;
      } catch (error) {
        this.notificationManager.error(`Could not upload "${file.name}": ${error.message}`);
      }
    }

    if (lastAdded) {
      this.settingsManager.updateBackgroundImage(
        this.settingsManager.buildUserPhotoUrl(lastAdded.id)
      );
      this.notificationManager.show(
        successCount > 1
          ? `${successCount} photos uploaded`
          : `Photo "${lastAdded.name}" set as background`,
        'success'
      );
    }

    await this.populateUserPhotos();
  }

  async populateUserPhotos() {
    const container = document.getElementById('user-photos-grid');
    if (!container) {
      return;
    }

    this.revokeUserPhotoThumbnails();

    const photos = await this.settingsManager.listUserPhotos();

    if (!photos.length) {
      this.renderSearchPlaceholder(
        container,
        'No uploaded photos yet',
        'Click "Upload photo" to add your own background'
      );
      return;
    }

    container.innerHTML = '';
    const currentBackground = this.settingsManager.getCurrentBackgroundImage();

    photos.forEach((photo) => {
      const photoUrl = this.settingsManager.buildUserPhotoUrl(photo.id);
      const thumbnailUrl = URL.createObjectURL(photo.blob);
      this.userPhotoThumbnailUrls.set(photo.id, thumbnailUrl);

      const option = document.createElement('div');
      option.className = 'background-option user-photo-option';
      option.dataset.backgroundUrl = photoUrl;
      if (photoUrl === currentBackground) {
        option.classList.add('selected');
      }

      const img = document.createElement('img');
      img.src = thumbnailUrl;
      img.alt = photo.name;
      img.loading = 'lazy';

      const name = document.createElement('div');
      name.className = 'background-name';
      name.textContent = photo.name;

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'user-photo-delete';
      deleteBtn.setAttribute('aria-label', `Delete ${photo.name}`);
      deleteBtn.textContent = '×';
      deleteBtn.addEventListener('click', async (event) => {
        event.stopPropagation();
        await this.handleUserPhotoDelete(photo);
      });

      option.appendChild(img);
      option.appendChild(name);
      option.appendChild(deleteBtn);

      option.addEventListener('click', () => {
        document.querySelectorAll('.background-option').forEach((opt) => {
          opt.classList.remove('selected');
        });
        option.classList.add('selected');
        this.settingsManager.updateBackgroundImage(photoUrl);
        this.notificationManager.show(`Background updated to "${photo.name}"`, 'success');
      });

      container.appendChild(option);
    });
  }

  async handleUserPhotoDelete(photo) {
    const wasActive =
      this.settingsManager.getCurrentBackgroundImage() ===
      this.settingsManager.buildUserPhotoUrl(photo.id);

    try {
      await this.settingsManager.deleteUserPhoto(photo.id);
    } catch (error) {
      this.notificationManager.error(`Failed to delete photo: ${error.message}`);
      return;
    }

    if (wasActive) {
      const fallback = this.settingsManager
        .getBackgroundOptions()
        .find((bg) => bg.id !== 'current')?.url;
      if (fallback) {
        this.settingsManager.updateBackgroundImage(fallback);
      }
      this.populateBackgroundOptions();
    }

    await this.populateUserPhotos();
    this.notificationManager.show(`Deleted "${photo.name}"`, 'success');
  }

  revokeUserPhotoThumbnails() {
    this.userPhotoThumbnailUrls.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch (error) {
        // ignore
      }
    });
    this.userPhotoThumbnailUrls.clear();
  }
}
