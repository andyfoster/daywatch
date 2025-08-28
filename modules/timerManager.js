export class TimerManager {
  constructor() {
    this.timers = JSON.parse(localStorage.getItem("timers")) || [];
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
      time,
      location: location ? this.sanitizeInput(location.trim()) : null,
      link: link ? this.sanitizeInput(link.trim()) : null
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
      time: time !== undefined ? time : existingTimer.time,
      location: location !== undefined ? (location ? this.sanitizeInput(location.trim()) : null) : existingTimer.location,
      link: link !== undefined ? (link ? this.sanitizeInput(link.trim()) : null) : existingTimer.link
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

  importTimers(text) {
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
          time: time || null,
          location: location || null,
          link: link || null
        });
      }
    }

    this.timers = newTimers;
    this.saveTimers();
  }

  // Private methods
  saveTimers() {
    localStorage.setItem("timers", JSON.stringify(this.timers));
  }

  sanitizeInput(input) {
    return input.replace(/[<>&"']/g, char => ({
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  sanitizeColor(color) {
    return /^#[0-9A-Fa-f]{6}$/.test(color) ? color : '#000000';
  }
}