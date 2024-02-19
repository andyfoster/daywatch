'use strict';

// Global variable definitions
const timersContainer = document.getElementById('timers-container');
const addTimerBtn = document.getElementById('add-timer-btn');
const timerModal = document.getElementById('timer-modal');
const modalTitle = document.getElementById('modal-title');
const timerForm = document.getElementById('timer-form');
const eventNameInput = document.getElementById('event-name');
const eventDateInput = document.getElementById('event-date');
const eventColorInput = document.getElementById('event-color');
const closeBtn = document.querySelector('.close');
const dateEl = document.getElementById('date'); // h1 that displays the date
const removeBtn = document.getElementById('remove-timer-btn');
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const settingsForm = document.getElementById('settings-form');
const dateFormatSelect = document.getElementById('date-format-select');
const displayFontSelect = document.getElementById('display-font');
const languageSelect = document.getElementById('language');
const settingsCloseBtn = document.querySelector('#settings-modal .close');

let timers = JSON.parse(localStorage.getItem('timers')) || [];
let dateFormat = localStorage.getItem('dateFormat') || 'long';
let displayFont = localStorage.getItem('displayFont') || 'Roboto Condensed';
let language = localStorage.getItem('language') || 'en';
languageSelect.value = language;

let handleFormSubmit;

// Set up event listeners
addTimerBtn.addEventListener('click', () => {
  showModal();
  handleFormSubmit = addTimer;
});
closeBtn.addEventListener('click', hideModal);
timerForm.addEventListener('submit', (event) => {
  event.preventDefault();
  handleFormSubmit();
  hideModal();
});
settingsBtn.addEventListener('click', showSettings);
settingsCloseBtn.addEventListener('click', hideSettings);
settingsForm.addEventListener('submit', (event) => {
  event.preventDefault();
  dateFormat = dateFormatSelect.value;
  displayFont = displayFontSelect.value;
  language = languageSelect.value;
  localStorage.setItem('dateFormat', dateFormat);
  localStorage.setItem('displayFont', displayFont);
  localStorage.setItem('language', language);
  hideSettings();
  renderTimers();
  updateUI();
  location.reload();
});

// Add double-click event listener
dateEl.addEventListener('dblclick', () => {
  // Check if the .overlay class is currently applied
  const isHidden = timersContainer.classList.contains('overlay');

  // Toggle the .overlay class
  if (isHidden) {
    timersContainer.classList.remove('overlay');
  } else {
    timersContainer.classList.add('overlay');
  }

  // Store the hidden state in localStorage
  localStorage.setItem('hideTimers', isHidden ? 'false' : 'true');
});

// Set the initial state based on the value stored in localStorage
const storedIsHidden = localStorage.getItem('hideTimers') === 'true';
if (storedIsHidden) {
  timersContainer.classList.add('overlay');
} else {
  timersContainer.classList.remove('overlay');
}

// Set up timers on load
window.onload = function () {
  sortTimers();
  renderTimers();
  updateUI();
  populateDateFormatOptions();
};

function populateDateFormatOptions() {
  const today = new Date();
  const longFormatOption = document.createElement('option');
  longFormatOption.value = 'long';
  longFormatOption.text = today.toLocaleDateString(language, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  dateFormatSelect.add(longFormatOption);

  const shortFormatOption = document.createElement('option');
  shortFormatOption.value = 'short';
  shortFormatOption.text = today.toLocaleDateString(language, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  dateFormatSelect.add(shortFormatOption);
}

function showSettings() {
  timerModal.style.display = 'none';
  settingsModal.style.display = 'block';
}

function hideSettings() {
  settingsModal.style.display = 'none';
}

function showModal(isEdit = false, index) {
  // Remove previous event listener
  removeBtn.onclick = null;

  modalTitle.textContent = isEdit
    ? translations[language].editTimer
    : translations[language].newTimer;
  eventNameInput.value = '';
  eventDateInput.value = '';
  eventColorInput.value = '#000000';
  timerModal.style.display = 'block';

  if (isEdit) {
    removeBtn.style.display = 'block';
    removeBtn.onclick = () => {
      removeTimer(index);
      hideModal();
    };
  } else {
    removeBtn.style.display = 'none';
  }
}

function hideModal() {
  timerModal.style.display = 'none';
}

function addTimer() {
  const eventName = eventNameInput.value.trim();
  const eventDate = eventDateInput.value;
  const eventColor = eventColorInput.value;
  if (eventName && eventDate) {
    const timer = {
      name: eventName,
      date: new Date(eventDate).getTime(),
      color: eventColor,
    };
    timers.push(timer);
    updateTimers();
  }
}

function removeTimer(index) {
  timers.splice(index, 1);
  updateTimers();
}

function editTimer(index) {
  const eventName = eventNameInput.value.trim();
  const eventDate = eventDateInput.value;
  const eventColor = eventColorInput.value;
  if (eventName && eventDate) {
    timers[index] = {
      name: eventName,
      date: new Date(eventDate).getTime(),
      color: eventColor,
    };
    updateTimers();
  }
}

function updateTimers() {
  sortTimers();
  localStorage.setItem('timers', JSON.stringify(timers));
  renderTimers();
}

function sortTimers() {
  timers.sort((a, b) => a.date - b.date);
}

function renderTimers() {
  timersContainer.innerHTML = '';
  timers.forEach((timer, index) => createTimerElement(timer, index));
}

function createTimerElement(timer, index) {
  const currentDate = new Date();
  // Strip the time from the current date
  currentDate.setHours(0, 0, 0, 0);

  const eventDate = new Date(timer.date);
  // Strip the time from the event date
  eventDate.setHours(0, 0, 0, 0);

  // Compare the dates to see if the event is today
  const isEventToday = eventDate.getTime() === currentDate.getTime();

  // Calculate the time difference and days remaining
  const timeDifference = eventDate - currentDate; // Now you can subtract directly since both dates are at midnight
  const daysRemaining = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));

  const timerEl = document.createElement('div');
  timerEl.classList.add('timer');
  if (isEventToday) {
    timerEl.classList.add('today-timer');
    timerEl.style.borderColor = timer.color;
  }
  timerEl.style.fontFamily = displayFont;

  // Make sure it's '1 day' and not '1 days'
  let daysString = (daysRemaining === 1 || daysRemaining === -1) ?
    translations[language].day :
    translations[language].days;

  timerEl.innerHTML = `
    <h2 class="${isEventToday ? 'today' : 'days-remaining'}">${isEventToday
      ? translations[language].today
      : daysRemaining + '<span class="days-label">' + daysString + '</span>'
    }</h2>
    <p class="due-date" style="color: ${timer.color};">${timer.name}</p>
    <button class="edit-btn">${formatDate(timer.date)}</button>
  `;

  const editBtn = timerEl.querySelector('.edit-btn');
  editBtn.addEventListener('click', () => {
    showModal(true, index);
    modalTitle.textContent = translations[language].editTimer;
    eventNameInput.value = timer.name;
    eventDateInput.value = new Date(timer.date).toISOString().slice(0, 10);
    eventColorInput.value = timer.color;
    handleFormSubmit = () => editTimer(index);
  });

  timersContainer.appendChild(timerEl);
}

function formatDate(date) {
  const options = {
    long: {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    },
    short: {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    },
    full: {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    },
  };
  return new Date(date).toLocaleDateString(language, options[dateFormat]);
}

function updateUI() {
  const today = new Date();
  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  dateEl.textContent = today.toLocaleDateString(language, options);
  modalTitle.textContent = translations[language].newTimer;
  document.querySelectorAll('label[for="event-name"]')[0].textContent =
    translations[language].eventName;
  document.querySelectorAll('label[for="event-date"]')[0].textContent =
    translations[language].eventDate;
  document.querySelectorAll('label[for="color"]')[0].textContent =
    translations[language].color;
  document.getElementById('submit-timer-btn').textContent =
    translations[language].save;
  document.getElementById('remove-timer-btn').textContent =
    translations[language].remove;
  document.getElementById('modal-title').textContent =
    translations[language].settings;
  document.getElementById('save-settings-btn').textContent =
    translations[language].save;
  document.querySelectorAll('label[for="date-format"]')[0].textContent =
    translations[language].dateFormat;
  document.querySelectorAll('label[for="display-font"]')[0].textContent =
    translations[language].font;
  document.querySelectorAll('label[for="language"]')[0].textContent =
    translations[language].language;
  document
    .getElementById('settings-form')
    .querySelectorAll('option[value="en"]')[0].textContent = "English";
  document
    .getElementById('settings-form')
    .querySelectorAll('option[value="ja"]')[0].textContent = "日本語";
  document
    .getElementById('settings-form')
    .querySelectorAll('option[value="es"]')[0].textContent = "Español";
  document
    .getElementById('settings-form')
    .querySelectorAll('option[value="zh"]')[0].textContent = "中文";
}
