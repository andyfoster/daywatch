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
const dateEl = document.getElementById('date');
const removeBtn = document.getElementById('remove-timer-btn');
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const settingsForm = document.getElementById('settings-form');
const dateFormatSelect = document.getElementById('date-format');
const displayFontSelect = document.getElementById('display-font');

// document.getElementById('add-dummy-timer-btn').addEventListener('click', () => {
//   createDummyTimer();
// });

let timers = JSON.parse(localStorage.getItem('timers')) || [];
let dateFormat = localStorage.getItem('dateFormat') || 'long';
let displayFont = localStorage.getItem('displayFont') || 'Roboto Condensed';

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
settingsForm.addEventListener('submit', (event) => {
  event.preventDefault();
  dateFormat = dateFormatSelect.value;
  displayFont = displayFontSelect.value;
  localStorage.setItem('dateFormat', dateFormat);
  localStorage.setItem('displayFont', displayFont);
  hideSettings();
  renderTimers();
});

// Set up timers on load
window.onload = function () {
  sortTimers();
  renderTimers();
  // Set date
  dateEl.textContent = new Date().toLocaleDateString('en-NZ', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  // Set date format select value
  dateFormatSelect.value = dateFormat;
};

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

  modalTitle.textContent = isEdit ? 'Edit Timer' : 'New Timer';
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
  const timeRemaining = timer.date - new Date().getTime();
  const daysRemaining = Math.floor(timeRemaining / (1000 * 60 * 60 * 24)) + 1;
  const timerEl = document.createElement('div');
  timerEl.classList.add('timer');
  timerEl.style.fontFamily = displayFont;
  timerEl.innerHTML = `
    <h2 class="days-remaining">${daysRemaining}<span class="days-label"> days</span></h2>
    <p class="due-date" style="color: ${timer.color};">${timer.name}</p>
    <button class="edit-btn">${formatDate(timer.date)}</button>
  `;

  const editBtn = timerEl.querySelector('.edit-btn');
  editBtn.addEventListener('click', () => {
    showModal(true, index);
    modalTitle.textContent = 'Edit Timer';
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
  };
  return new Date(date).toLocaleDateString('en-NZ', options[dateFormat]);
}
