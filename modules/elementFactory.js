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
    anchorEl.innerHTML = "🔗"; // Link icon
    anchorEl.target = "_blank";
    anchorEl.rel = "noopener noreferrer";
    anchorEl.title = timer.link; // Show URL on hover
    anchorEl.style.textDecoration = "none";
    anchorEl.style.fontSize = "1.2em";

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
    const eventNameSpan = document.createElement("span");
    let eventText = `${timer.name} - ${Math.ceil((new Date(timer.date) - new Date()) / (1000 * 60 * 60 * 24))} days`;
    if (timer.time) {
      eventText += ` (${timer.time})`;
    }
    eventNameSpan.textContent = eventText;
    return eventNameSpan;
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