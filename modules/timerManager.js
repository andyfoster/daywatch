export class TimerManager {
  constructor() {
    const parsedTimers = JSON.parse(localStorage.getItem("timers")) || [];
    const rawTimers = Array.isArray(parsedTimers) ? parsedTimers : [];

    this.timers = rawTimers
      .map(timer => this.normalizeTimer(timer))
      .filter(Boolean);

    const wasNormalized =
      rawTimers.length !== this.timers.length ||
      rawTimers.some((timer, index) => JSON.stringify(timer) !== JSON.stringify(this.timers[index]));

    if (wasNormalized) {
      this.saveTimers();
    }
  }

  addTimer(name, date, color, showOnMainScreen = true, time = null, location = null, link = null) {
    // Input validation
    if (!name?.trim() || !date || !color) {
      throw new Error("Invalid timer data");
    }

    const timer = {
      name: this.sanitizeInput(name.trim()),
      date: new Date(date).getTime(),
      color: this.sanitizeColor(color),
      showOnMainScreen,
      time: time ? this.sanitizeInput(time) : null,
      location: location ? this.sanitizeInput(location.trim()) : null,
      link: link ? this.sanitizeLink(link.trim()) : null
    };

    this.timers.push(timer);
    this.saveTimers();
    return timer;
  }

  editTimer(index, name, date, color, showOnMainScreen, time, location, link) {
    if (index < 0 || index >= this.timers.length) {
      throw new Error("Invalid timer index");
    }

    // Input validation
    if (!name?.trim() || !date || !color) {
      throw new Error("Invalid timer data");
    }

    const existingTimer = this.timers[index];
    this.timers[index] = {
      ...existingTimer,
      name: this.sanitizeInput(name.trim()),
      date: new Date(date).getTime(),
      color: this.sanitizeColor(color),
      showOnMainScreen,
      time: time !== undefined ? (time ? this.sanitizeInput(time) : null) : existingTimer.time,
      location: location !== undefined ? (location ? this.sanitizeInput(location.trim()) : null) : existingTimer.location,
      link: link !== undefined ? (link ? this.sanitizeLink(link.trim()) : null) : existingTimer.link
    };

    this.saveTimers();
    return this.timers[index];
  }

  removeTimer(index) {
    if (index < 0 || index >= this.timers.length) {
      throw new Error("Invalid timer index");
    }

    this.timers.splice(index, 1);
    this.saveTimers();
  }

  setTimerVisibility(index, showOnMainScreen) {
    if (index < 0 || index >= this.timers.length) {
      throw new Error("Invalid timer index");
    }

    this.timers[index] = {
      ...this.timers[index],
      showOnMainScreen: Boolean(showOnMainScreen)
    };
    this.saveTimers();
    return this.timers[index];
  }

  setTimersVisibility(indices, showOnMainScreen) {
    const validIndices = indices
      .filter(index => Number.isInteger(index))
      .filter(index => index >= 0 && index < this.timers.length);

    validIndices.forEach(index => {
      this.timers[index].showOnMainScreen = Boolean(showOnMainScreen);
    });

    if (validIndices.length > 0) {
      this.saveTimers();
    }

    return validIndices.length;
  }

  getTimers() {
    return [...this.timers];
  }

  sortTimers() {
    this.timers.sort((a, b) => {
      // First sort by date
      const dateDiff = a.date - b.date;
      if (dateDiff !== 0) {
        return dateDiff;
      }

      // If dates are the same, sort by time
      // Events without time come after events with time
      if (a.time && !b.time) return -1;
      if (!a.time && b.time) return 1;
      if (!a.time && !b.time) return 0;

      // Both have times, sort by time
      return a.time.localeCompare(b.time);
    });
    this.saveTimers();
  }

  exportTimers() {
    return this.timers.map(timer =>
      `${timer.name}; ${new Date(timer.date).toISOString().slice(0, 10)}; ${timer.color}; ${timer.showOnMainScreen}; ${timer.time || ''}; ${timer.location || ''}; ${timer.link || ''}`
    ).join('\n');
  }

  importTimers(text, options = {}) {
    const { format = 'auto', mode = 'replace' } = options;
    let newTimers = [];

    try {
      // Auto-detect format or use specified format
      const detectedFormat = format === 'auto' ? this.detectImportFormat(text) : format;

      switch (detectedFormat) {
        case 'json':
          newTimers = this.parseJsonImport(text);
          break;
        case 'csv':
          newTimers = this.parseCsvImport(text);
          break;
        case 'text':
        default:
          newTimers = this.parseTextImport(text);
          break;
      }

      // Validate imported timers
      newTimers = newTimers.filter(timer => this.validateImportedTimer(timer));

      if (newTimers.length === 0) {
        throw new Error('No valid timers found in import data');
      }

      // Apply import mode
      if (mode === 'replace') {
        this.timers = newTimers;
      } else if (mode === 'append') {
        this.timers = [...this.timers, ...newTimers];
      }

      this.sortTimers();
      return {
        success: true,
        imported: newTimers.length,
        total: this.timers.length
      };
    } catch (error) {
      throw new Error(`Import failed: ${error.message}`);
    }
  }

  detectImportFormat(text) {
    const trimmed = text.trim();

    // Check for JSON format
    if ((trimmed.startsWith('[') && trimmed.endsWith(']')) ||
        (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
      return 'json';
    }

    // Check for CSV format (comma-separated with potential headers)
    const lines = trimmed.split('\n');
    if (lines.length > 0) {
      const firstLine = lines[0];
      if (firstLine.includes(',') && !firstLine.includes('; ')) {
        return 'csv';
      }
    }

    // Default to text format
    return 'text';
  }

  parseJsonImport(text) {
    const data = JSON.parse(text);
    const timers = Array.isArray(data) ? data : [data];

    return timers.map(timer => ({
      name: this.sanitizeInput(timer.name || ''),
      date: timer.date ? new Date(timer.date).getTime() : Date.now(),
      color: this.sanitizeColor(timer.color || '#000000'),
      showOnMainScreen: timer.showOnMainScreen !== false,
      time: timer.time ? this.sanitizeInput(timer.time) : null,
      location: timer.location ? this.sanitizeInput(timer.location) : null,
      link: timer.link ? this.sanitizeLink(timer.link) : null
    }));
  }

  parseCsvImport(text) {
    const lines = text.split('\n').filter(line => line.trim());
    const newTimers = [];

    // Check if first line is a header
    const firstLine = lines[0].toLowerCase();
    const hasHeader = firstLine.includes('name') || firstLine.includes('event') || firstLine.includes('title');
    const dataLines = hasHeader ? lines.slice(1) : lines;

    for (const line of dataLines) {
      const values = this.parseCsvLine(line);
      if (values.length >= 2 && values[0]?.trim() && values[1]?.trim()) {
        const dateValue = new Date(values[1]).getTime();
        if (!isNaN(dateValue)) {
          newTimers.push({
            name: this.sanitizeInput(values[0]),
            date: dateValue,
            color: this.sanitizeColor(values[2] || '#000000'),
            showOnMainScreen: values[3] !== 'false' && values[3] !== '0',
            time: values[4] ? this.sanitizeInput(values[4]) : null,
            location: values[5] ? this.sanitizeInput(values[5]) : null,
            link: values[6] ? this.sanitizeLink(values[6]) : null
          });
        }
      }
    }

    return newTimers;
  }

  parseCsvLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    values.push(current.trim());
    return values.map(val => val.replace(/^"|"$/g, '')); // Remove surrounding quotes
  }

  parseTextImport(text) {
    const lines = text.split("\n");
    const newTimers = [];

    for (const line of lines) {
      const [name, date, color, showOnMainScreen, time, location, link] = line.split("; ");
      if (name && date) {
        newTimers.push({
          name: this.sanitizeInput(name),
          date: new Date(date).getTime(),
          color: this.sanitizeColor(color),
          showOnMainScreen: showOnMainScreen === 'true',
          time: time ? this.sanitizeInput(time) : null,
          location: location ? this.sanitizeInput(location) : null,
          link: link ? this.sanitizeLink(link) : null
        });
      }
    }

    return newTimers;
  }

  validateImportedTimer(timer) {
    return timer.name &&
           timer.name.trim().length > 0 &&
           timer.date &&
           !isNaN(timer.date) &&
           timer.color &&
           /^#[0-9A-Fa-f]{6}$/.test(timer.color);
  }

  // Private methods
  saveTimers() {
    localStorage.setItem("timers", JSON.stringify(this.timers));
  }

  sanitizeInput(input) {
    if (input === null || input === undefined) {
      return '';
    }

    return String(input)
      .replace(/[\u0000-\u001F\u007F]/g, '')
      .trim();
  }

  sanitizeLink(link) {
    const sanitizedLink = this.sanitizeInput(link);

    if (!sanitizedLink) {
      return null;
    }

    const isSafeHttpUrl = /^https?:\/\/\S+$/i.test(sanitizedLink);
    return isSafeHttpUrl ? sanitizedLink : null;
  }

  decodeLegacyEntities(input) {
    if (typeof input !== 'string') {
      return '';
    }

    return input.replace(/&(lt|gt|amp|quot|#39);/g, (match) => {
      const map = {
        '&lt;': '<',
        '&gt;': '>',
        '&amp;': '&',
        '&quot;': '"',
        '&#39;': "'"
      };
      return map[match] || match;
    });
  }

  normalizeTimer(timer) {
    if (!timer || typeof timer !== 'object') {
      return null;
    }

    const decodedName = this.decodeLegacyEntities(timer.name || '');
    const decodedTime = timer.time ? this.decodeLegacyEntities(timer.time) : null;
    const decodedLocation = timer.location ? this.decodeLegacyEntities(timer.location) : null;
    const decodedLink = timer.link ? this.decodeLegacyEntities(timer.link) : null;

    return {
      name: this.sanitizeInput(decodedName),
      date: Number.isFinite(Number(timer.date)) ? Number(timer.date) : Date.now(),
      color: this.sanitizeColor(timer.color || '#000000'),
      showOnMainScreen: timer.showOnMainScreen !== false,
      time: decodedTime ? this.sanitizeInput(decodedTime) : null,
      location: decodedLocation ? this.sanitizeInput(decodedLocation) : null,
      link: decodedLink ? this.sanitizeLink(decodedLink) : null
    };
  }

  sanitizeColor(color) {
    return /^#[0-9A-Fa-f]{6}$/.test(color) ? color : '#000000';
  }
}
