export class ElementFactory {
  static createLocationElement(timer, className = "timer-location") {
    if (!timer.location) return null;

    const locationEl = document.createElement("p");
    locationEl.className = className;
    locationEl.style.color = timer.color;

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
    linkEl.style.color = timer.color;

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

  static createTimerName(timer) {
    const nameEl = document.createElement("p");
    nameEl.className = "due-date";
    nameEl.style.color = timer.color;
    nameEl.textContent = timer.name;
    return nameEl;
  }

  static createWeekdayCount(weekdaysRemaining, timerColor = "#385174") {
    const weekdayCountEl = document.createElement("p");
    weekdayCountEl.className = "weekday-count";
    weekdayCountEl.style.color = timerColor;

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

  static createEditButton(timer, index, onClickHandler, settingsManager) {
    const editBtn = document.createElement("button");
    editBtn.className = "edit-btn";

    let dateText = settingsManager.formatDate(timer.date);
    if (timer.time) {
      dateText += ` ${timer.time}`;
    }

    editBtn.textContent = dateText;
    editBtn.addEventListener("click", () => onClickHandler(true, index));
    return editBtn;
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
