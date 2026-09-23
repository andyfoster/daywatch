export class ImportManager {
  constructor(timerManager, modalManager, notificationManager, onImportComplete) {
    this.timerManager = timerManager;
    this.modalManager = modalManager;
    this.notificationManager = notificationManager;
    this.onImportComplete = onImportComplete || (() => {});
    this.initialized = false;
    this.importData = null;
  }

  show() {
    this.modalManager.showModal("import-modal", {
      setup: () => this.initializeImportModal()
    });
  }

  initializeImportModal() {
    // Reset modal state
    this.resetImportModal();

    // Only set up event listeners if not already done
    if (!this.initialized) {
      this.setupImportEventListeners();
      this.initialized = true;
    }
  }

  setupImportEventListeners() {
    this.setupFileUpload();
    this.setupTextImport();

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

    browseBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        this.handleFileUpload(e.target.files[0]);
      }
    });

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

      this.notificationManager.show(`File "${file.name}" loaded successfully`, 'success');
    } catch (error) {
      this.notificationManager.error(`Failed to read file: ${error.message}`);
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
        this.notificationManager.error('Please enter or upload some data to import');
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
      this.notificationManager.error(error.message);
      document.getElementById('import-preview').style.display = 'none';
      document.getElementById('confirm-import-btn').disabled = true;
    }
  }

  showImportPreview(timers, result) {
    const previewDiv = document.getElementById('import-preview');
    const contentDiv = document.getElementById('preview-content');
    const summaryP = document.getElementById('preview-summary');

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

    previewDiv.style.display = 'block';
  }

  confirmImport() {
    if (!this.importData) {
      this.notificationManager.error('No import data available. Please preview first.');
      return;
    }

    try {
      const { text, format, mode } = this.importData;
      const result = this.timerManager.importTimers(text, { format, mode });

      if (result.success) {
        this.modalManager.hideModal("import-modal");
        this.onImportComplete();
        this.notificationManager.show(
          `Successfully imported ${result.imported} timer(s). Total: ${result.total}`,
          'success'
        );
      }
    } catch (error) {
      this.notificationManager.error(error.message);
    }
  }
}
