import { ElementFactory } from './elementFactory.js';

export class TimerRenderer {
  constructor(timerManager, settingsManager, translations, { onEditTimer, onAddTimer } = {}) {
    this.timerManager = timerManager;
    this.settingsManager = settingsManager;
    this.translations = translations;
    this.onEditTimer = onEditTimer || (() => {});
    this.onAddTimer = onAddTimer || (() => {});

    this.timersContainer = document.getElementById("timers-container");
    this.eventsList = document.getElementById("events-list");
    this.countdownIntervals = [];
  }

  renderTimers() {
    this.renderMainTimers();
    this.renderSidebarEvents();
  }

  renderMainTimers() {
    this.clearCountdownIntervals();
    this.timersContainer.innerHTML = "";
    const timers = this.timerManager.getTimers();

    timers.forEach((timer, index) => {
      if (timer.showOnMainScreen) {
        this.createTimerElement(timer, index);
      }
    });

    this.appendAddTimerPlaceholder();
  }

  appendAddTimerPlaceholder() {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "timer add-timer-placeholder";
    card.setAttribute("aria-label", "Add new timer");

    const icon = document.createElement("span");
    icon.className = "add-timer-placeholder-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "+";

    const label = document.createElement("span");
    label.className = "add-timer-placeholder-label";
    label.textContent = "Add timer";

    card.appendChild(icon);
    card.appendChild(label);
    card.addEventListener("click", () => this.onAddTimer());

    this.timersContainer.appendChild(card);
  }

  createTimerElement(timer, index) {
    const { isEventToday, daysRemaining, weekdaysRemaining } = this.calculateTimerData(timer);
    const settings = this.settingsManager.getCurrentSettings();

    // Create main timer container
    const timerEl = document.createElement("div");
    timerEl.classList.add("timer");
    if (isEventToday) {
      timerEl.classList.add("today-timer");
      timerEl.style.borderColor = ElementFactory.getReadableColor(timer.color);
    }
    timerEl.style.fontFamily = settings.displayFont;

    // Create and append elements using ElementFactory
    const headerEl = ElementFactory.createTimerHeader(isEventToday, daysRemaining, this.translations, settings.language);
    const nameEl = ElementFactory.createTimerName(timer);
    const weekdayCountEl = settings.showWeekdays !== false
      ? ElementFactory.createWeekdayCount(weekdaysRemaining, timer.color)
      : null;
    const locationEl = ElementFactory.createLocationElement(timer);
    const linkEl = ElementFactory.createLinkElement(timer);
    const dateLabelEl = ElementFactory.createDateDisplay(timer, this.settingsManager);
    const editBtn = ElementFactory.createEditIconButton(timer, index, (idx) => this.onEditTimer(idx));
    const hideBtn = ElementFactory.createHideButton(timer, index, (idx) => this.hideTimerFromMainScreen(idx, timerEl));

    timerEl.appendChild(editBtn);
    timerEl.appendChild(hideBtn);
    timerEl.appendChild(headerEl);

    if (isEventToday) {
      const countdownEl = ElementFactory.createEventCountdown(timer);
      if (countdownEl) {
        timerEl.appendChild(countdownEl);
        this.registerCountdown(countdownEl, timer.time);
      }
    }

    timerEl.appendChild(nameEl);
    if (weekdayCountEl) {
      timerEl.appendChild(weekdayCountEl);
    }
    if (locationEl) {
      timerEl.appendChild(locationEl);
    }
    if (linkEl) {
      timerEl.appendChild(linkEl);
    }
    timerEl.appendChild(dateLabelEl);

    this.timersContainer.appendChild(timerEl);
  }

  hideTimerFromMainScreen(index, timerEl) {
    if (!timerEl) {
      this.timerManager.setTimerVisibility(index, false);
      this.renderTimers();
      return;
    }

    this.flyCardIntoStack(timerEl, () => {
      this.timerManager.setTimerVisibility(index, false);
      this.renderTimers();
    });
  }

  flyCardIntoStack(timerEl, onComplete) {
    const stackTarget = document.getElementById("toggle-panel");
    const startRect = timerEl.getBoundingClientRect();
    const targetRect = stackTarget ? stackTarget.getBoundingClientRect() : null;

    const endX = targetRect ? targetRect.left + targetRect.width / 2 : startRect.left;
    const endY = targetRect ? targetRect.top + targetRect.height / 2 : startRect.top + startRect.height / 2;
    const dx = endX - (startRect.left + startRect.width / 2);
    const dy = endY - (startRect.top + startRect.height / 2);

    // Animate a fixed-position copy so the flight isn't clipped by the
    // scrollable grid and isn't cut short if the grid re-renders mid-flight.
    const ghost = timerEl.cloneNode(true);
    ghost.classList.add("timer-hide-ghost");
    ghost.style.top = `${startRect.top}px`;
    ghost.style.left = `${startRect.left}px`;
    ghost.style.width = `${startRect.width}px`;
    ghost.style.height = `${startRect.height}px`;
    document.body.appendChild(ghost);
    timerEl.style.visibility = "hidden";

    void ghost.offsetWidth; // force layout so the transform below actually transitions

    requestAnimationFrame(() => {
      ghost.style.transform = `translate(${dx}px, ${dy}px) scale(0.05)`;
      ghost.style.opacity = "0";
    });

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      ghost.remove();
      onComplete();
    };

    ghost.addEventListener("transitionend", finish);
    setTimeout(finish, 450);
  }

  registerCountdown(countdownEl, timeString) {
    const intervalId = setInterval(() => {
      const secondsRemaining = ElementFactory.calculateSecondsRemainingToday(timeString);

      if (secondsRemaining <= 0) {
        countdownEl.remove();
        clearInterval(intervalId);
        return;
      }

      countdownEl.textContent = ElementFactory.formatCountdown(secondsRemaining);
    }, 1000);

    this.countdownIntervals.push(intervalId);
  }

  clearCountdownIntervals() {
    this.countdownIntervals.forEach((intervalId) => clearInterval(intervalId));
    this.countdownIntervals = [];
  }

  calculateTimerData(timer) {
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    const eventDate = new Date(timer.date);
    eventDate.setHours(0, 0, 0, 0);

    const isEventToday = eventDate.getTime() === currentDate.getTime();
    const timeDifference = eventDate - currentDate;
    const daysRemaining = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));
    const weekdaysRemaining = this.calculateWeekdaysDifference(currentDate, eventDate);

    return { isEventToday, daysRemaining, weekdaysRemaining };
  }

  calculateWeekdaysDifference(startDate, endDate) {
    const direction = endDate >= startDate ? 1 : -1;
    const cursor = new Date(startDate);
    let weekdays = 0;

    while (cursor.getTime() !== endDate.getTime()) {
      cursor.setDate(cursor.getDate() + direction);
      const dayOfWeek = cursor.getDay();
      const isWeekday = dayOfWeek !== 0 && dayOfWeek !== 6;
      if (isWeekday) {
        weekdays += direction;
      }
    }

    return weekdays;
  }

  renderSidebarEvents() {
    this.eventsList.innerHTML = "";

    const timers = this.timerManager.getTimers();
    timers.forEach((timer, index) => {
      const li = this.createSidebarEventItem(timer, index);
      this.eventsList.appendChild(li);
    });
  }

  createSidebarEventItem(timer, index) {
    const li = document.createElement("li");
    li.style.color = ElementFactory.getReadableColor(timer.color);
    li.setAttribute("data-date", new Date(timer.date).toLocaleDateString());
    li.classList.add(timer.showOnMainScreen ? "shown-on-main" : "not-shown-on-main");

    const row = document.createElement("div");
    row.className = "sidebar-event-row";

    const visibilityCheckbox = document.createElement("input");
    visibilityCheckbox.type = "checkbox";
    visibilityCheckbox.className = "sidebar-visibility-checkbox form-check-input";
    visibilityCheckbox.checked = Boolean(timer.showOnMainScreen);
    visibilityCheckbox.setAttribute("aria-label", `Show ${timer.name} on main screen`);

    visibilityCheckbox.addEventListener("click", (event) => {
      event.stopPropagation();
    });

    visibilityCheckbox.addEventListener("change", (event) => {
      event.stopPropagation();
      this.timerManager.setTimerVisibility(index, visibilityCheckbox.checked);
      this.renderTimers();
    });

    // Create event text
    const eventDetails = ElementFactory.createSidebarEventText(timer);
    row.appendChild(visibilityCheckbox);
    row.appendChild(eventDetails);
    li.appendChild(row);

    // Add location if available
    const locationEl = ElementFactory.createLocationElement(timer, "sidebar-location");
    if (locationEl) {
      li.appendChild(locationEl);
    }

    // Add link icon if available (but no location)
    const linkEl = ElementFactory.createLinkElement(timer, "sidebar-link");
    if (linkEl) {
      li.appendChild(document.createTextNode(" "));
      li.appendChild(linkEl);
    }

    // Add click handler
    li.addEventListener("click", (event) => {
      if (event.target.closest("a") || event.target.closest(".sidebar-visibility-checkbox")) {
        return;
      }

      this.onEditTimer(index);
    });

    return li;
  }
}
