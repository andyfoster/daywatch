export class ElementFactory {
  static getReadableColor(color) {
    if (!color || typeof color !== "string") return color;
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return color;
    }

    const hex = color.startsWith("#") ? color.slice(1) : color;
    let r, g, b;
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length === 6) {
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
    } else {
      return color;
    }
    if ([r, g, b].some((v) => Number.isNaN(v))) return color;

    const toLin = (c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    const luminance = 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
    const toHex = (c) => c.toString(16).padStart(2, "0");
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    if (isDark) {
      if (luminance >= 0.35) return color;
      const t = luminance < 0.05 ? 0.72 : luminance < 0.15 ? 0.55 : 0.4;
      const mix = (c) => Math.round(c + (255 - c) * t);
      return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
    }

    if (luminance <= 0.5) return color;
    const t = luminance > 0.85 ? 0.78 : luminance > 0.7 ? 0.6 : 0.4;
    const mix = (c) => Math.round(c * (1 - t));
    return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
  }

  static createLocationElement(timer, className = "timer-location") {
    if (!timer.location) return null;

    const locationEl = document.createElement("p");
    locationEl.className = className;
    locationEl.style.color = ElementFactory.getReadableColor(timer.color);

    if (timer.link) {
      const linkEl = document.createElement("a");
      linkEl.href = timer.link;
      linkEl.textContent = timer.location;
      linkEl.target = "_blank";
      linkEl.rel = "noopener noreferrer";
      locationEl.appendChild(linkEl);
    } else {
      locationEl.textContent = timer.location;
    }

    return locationEl;
  }

  static createLinkElement(timer, className = "timer-link") {
    if (!timer.link || timer.location) return null; // Only show if link exists but no location

    const linkEl = document.createElement("p");
    linkEl.className = className;
    linkEl.style.color = ElementFactory.getReadableColor(timer.color);

    const anchorEl = document.createElement("a");
    anchorEl.href = timer.link;
    anchorEl.textContent = "Open link";
    anchorEl.target = "_blank";
    anchorEl.rel = "noopener noreferrer";
    anchorEl.title = timer.link; // Show URL on hover

    linkEl.appendChild(anchorEl);
    return linkEl;
  }

  static createTimerHeader(isEventToday, daysRemaining, translations, language) {
    const headerEl = document.createElement("h2");
    headerEl.className = isEventToday ? "today" : "days-remaining";

    if (isEventToday) {
      headerEl.textContent = translations[language].today;
    } else {
      headerEl.textContent = daysRemaining;
      const daysLabelSpan = document.createElement("span");
      daysLabelSpan.className = "days-label";
      const daysString = Math.abs(daysRemaining) === 1 ?
        translations[language].day :
        translations[language].days;
      daysLabelSpan.textContent = daysString;
      headerEl.appendChild(daysLabelSpan);
    }

    return headerEl;
  }

  static calculateSecondsRemainingToday(timeString) {
    if (!timeString) return 0;

    const [hours, minutes] = timeString.split(":").map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0;

    const target = new Date();
    target.setHours(hours, minutes, 0, 0);

    const diffMs = target.getTime() - Date.now();
    return Math.max(0, Math.round(diffMs / 1000));
  }

  static formatCountdown(totalSeconds) {
    const safeSeconds = Math.max(0, Math.floor(totalSeconds));
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const seconds = safeSeconds % 60;

    return [hours, minutes, seconds]
      .map((unit) => String(unit).padStart(2, "0"))
      .join(":");
  }

  static createEventCountdown(timer) {
    if (!timer.time) return null;

    const secondsRemaining = ElementFactory.calculateSecondsRemainingToday(timer.time);
    if (secondsRemaining <= 0) return null;

    const countdownEl = document.createElement("p");
    countdownEl.className = "event-countdown";
    countdownEl.setAttribute("aria-live", "polite");
    countdownEl.textContent = ElementFactory.formatCountdown(secondsRemaining);

    return countdownEl;
  }

  static createTimerName(timer) {
    const nameEl = document.createElement("p");
    nameEl.className = "due-date";
    nameEl.style.color = ElementFactory.getReadableColor(timer.color);
    nameEl.textContent = timer.name;
    return nameEl;
  }

  static createWeekdayCount(weekdaysRemaining, timerColor = "#385174") {
    const weekdayCountEl = document.createElement("p");
    weekdayCountEl.className = "weekday-count";
    weekdayCountEl.style.color = ElementFactory.getReadableColor(timerColor);

    const absWeekdays = Math.abs(weekdaysRemaining);
    const label = absWeekdays === 1 ? "weekday" : "weekdays";

    if (weekdaysRemaining < 0) {
      weekdayCountEl.textContent = `${absWeekdays} ${label} ago`;
    } else if (weekdaysRemaining === 0) {
      weekdayCountEl.textContent = `0 ${label} remaining`;
    } else {
      weekdayCountEl.textContent = `${weekdaysRemaining} ${label} remaining`;
    }

    return weekdayCountEl;
  }

  static createDateDisplay(timer, settingsManager) {
    const dateLabelEl = document.createElement("p");
    dateLabelEl.className = "timer-date-label";

    let dateText = settingsManager.formatDate(timer.date);
    if (timer.time) {
      dateText += ` ${timer.time}`;
    }

    dateLabelEl.textContent = dateText;
    return dateLabelEl;
  }

  static createEditIconButton(timer, index, onClickHandler) {
    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "timer-edit-btn";
    editBtn.setAttribute("aria-label", `Edit ${timer.name}`);
    editBtn.title = "Edit";
    editBtn.innerHTML = `
      <svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"></path>
      </svg>
    `;

    editBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      onClickHandler(index);
    });

    return editBtn;
  }

  static createHideButton(timer, index, onClickHandler) {
    const hideBtn = document.createElement("button");
    hideBtn.type = "button";
    hideBtn.className = "timer-hide-btn";
    hideBtn.setAttribute("aria-label", `Hide ${timer.name} from main screen`);
    hideBtn.title = "Hide from main screen";
    hideBtn.innerHTML = `
      <svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"></path>
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"></path>
        <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"></path>
        <line x1="1" y1="1" x2="23" y2="23"></line>
      </svg>
    `;

    hideBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      onClickHandler(index);
    });

    return hideBtn;
  }

  static createSidebarEventText(timer) {
    const container = document.createElement("div");
    container.className = "sidebar-event-details";

    const eventNameSpan = document.createElement("span");
    eventNameSpan.className = "sidebar-event-name";
    eventNameSpan.textContent = timer.name;

    const metaRow = document.createElement("div");
    metaRow.className = "sidebar-event-meta";

    const dateSpan = document.createElement("span");
    dateSpan.className = "sidebar-event-date";
    dateSpan.textContent = new Date(timer.date).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric"
    });

    const daysSpan = document.createElement("span");
    daysSpan.className = "sidebar-days-remaining";

    const dayDifference = Math.ceil((new Date(timer.date) - new Date()) / (1000 * 60 * 60 * 24));
    const absDays = Math.abs(dayDifference);

    if (dayDifference < 0) {
      daysSpan.textContent = `${absDays} ${absDays === 1 ? "day" : "days"} ago`;
    } else if (dayDifference === 0) {
      daysSpan.textContent = "Today";
    } else {
      daysSpan.textContent = `${dayDifference} ${dayDifference === 1 ? "day" : "days"} left`;
    }

    if (timer.time) {
      const timeSpan = document.createElement("span");
      timeSpan.className = "sidebar-event-time";
      timeSpan.textContent = timer.time;
      metaRow.appendChild(timeSpan);
    }

    container.appendChild(eventNameSpan);
    metaRow.appendChild(dateSpan);
    metaRow.appendChild(daysSpan);
    container.appendChild(metaRow);
    return container;
  }

  static createDownloadLink(filename, content) {
    const element = document.createElement("a");
    const url = URL.createObjectURL(new Blob([content], { type: "text/plain" }));

    element.href = url;
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(url);
  }
}
