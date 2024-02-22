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
const sidebarNewTimerBtn = document.querySelector('#new-timer-btn-sidebar');
const togglePanel = document.getElementById('toggle-panel');


// Side panel
// const toggleButton = document.getElementById('toggle-events-btn');
const sidePanel = document.getElementById('events-side-panel');

let timers = JSON.parse(localStorage.getItem('timers')) || [];
let dateFormat = localStorage.getItem('dateFormat') || 'long';
let displayFont = localStorage.getItem('displayFont') || 'Roboto Condensed';
let language = localStorage.getItem('language') || 'en';
languageSelect.value = language;

let handleFormSubmit;

document.getElementById('toggle-panel').addEventListener('click', function () {
  const sidebarContainer = document.getElementById('sidebar-container');
  const toggleArrow = document.getElementById('toggle-arrow');

  // Check the current state of the sidebar
  const isSidebarVisible = sidebarContainer.style.transform === 'translateX(0px)';

  if (isSidebarVisible) {
    togglePanel.style.background = 'transparent';
    // Hide the sidebar
    sidebarContainer.style.transform = 'translateX(-100%)';
    toggleArrow.textContent = '>'; // Change arrow direction
  } else {
    togglePanel.style.background = '#eee';
    // Show the sidebar
    sidebarContainer.style.transform = 'translateX(0)';
    toggleArrow.textContent = '<'; // Change arrow direction
  }
});


sidebarNewTimerBtn.addEventListener('click', () => {
  showModal();
  handleFormSubmit = (showOnMainScreen) => addTimer(showOnMainScreen); // Use a wrapper function
});


// Set up event listeners
addTimerBtn.addEventListener('click', () => {
  showModal();
  handleFormSubmit = (showOnMainScreen) => addTimer(showOnMainScreen); // Use a wrapper function
});
closeBtn.addEventListener('click', hideModal);
timerForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const showOnMainScreenCheckbox = document.getElementById('show-on-main-screen'); // Get the checkbox
  const showOnMainScreen = showOnMainScreenCheckbox.checked; // Get the checked state
  handleFormSubmit(showOnMainScreen);
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

// const sidePanel = document.getElementById('events-side-panel');

togglePanel.addEventListener('click', function () {
  sidePanel.classList.toggle('visible'); // Toggle visibility class
});

// toggleButton.addEventListener('click', function () {
//   if (sidePanel.style.display === 'none' || sidePanel.style.display === '') {
//     sidePanel.style.display = 'block';
//   } else {
//     sidePanel.style.display = 'none';
//   }
// });




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

  const showOnMainScreenCheckbox = document.getElementById('show-on-main-screen');


  if (isEdit) {
    const timer = timers[index];
    modalTitle.textContent = "Edit Timer"; // Adjust according to your translations
    eventNameInput.value = timer.name;
    eventDateInput.value = new Date(timer.date).toISOString().slice(0, 10);
    eventColorInput.value = timer.color;
    // document.getElementById('show-on-main-screen').checked = timer.showOnMainScreen ?? true; // Default to true if undefined
    showOnMainScreenCheckbox.checked = timer.showOnMainScreen;

    removeBtn.style.display = 'block';
    removeBtn.onclick = () => {
      removeTimer(index);
      hideModal();
    };

    handleFormSubmit = (showOnMainScreen) => editTimer(index, showOnMainScreen);

  } else {
    removeBtn.style.display = 'none';
    handleFormSubmit = (showOnMainScreen) => addTimer(showOnMainScreen); // Use a wrapper function for consistency
    // For new timers, you might want to default the checkbox to checked
    showOnMainScreenCheckbox.checked = true;

  }
  timerModal.style.display = 'block';
}

function hideModal() {
  timerModal.style.display = 'none';
}

function addTimer(showOnMainScreen = true) { // Default to true if not provided
  const eventName = eventNameInput.value.trim();
  const eventDate = eventDateInput.value;
  const eventColor = eventColorInput.value;
  if (eventName && eventDate) {
    const timer = {
      name: eventName,
      date: new Date(eventDate).getTime(),
      color: eventColor,
      showOnMainScreen: showOnMainScreen // Use the provided value or default
    };
    timers.push(timer);
    updateTimers();
  }
}


function editTimer(index, showOnMainScreen) {
  const eventName = eventNameInput.value.trim();
  const eventDate = eventDateInput.value;
  const eventColor = eventColorInput.value;
  if (eventName && eventDate) {
    timers[index] = {
      name: eventName,
      date: new Date(eventDate).getTime(),
      color: eventColor,
      showOnMainScreen: showOnMainScreen
    };
    updateTimers();
  }
}


function removeTimer(index) {
  timers.splice(index, 1);
  updateTimers();
}


function updateTimers() {
  sortTimers();
  localStorage.setItem('timers', JSON.stringify(timers));
  renderTimers();
}

function sortTimers() {
  timers.sort((a, b) => a.date - b.date);
}

function renderSidebarEvents() {
  const sidebarList = document.getElementById('events-list');
  sidebarList.innerHTML = ''; // Clear the current list

  timers.forEach((timer, index) => {
    const li = document.createElement('li');
    li.style.color = timer.color; // Set the text color to the timer's color
    li.setAttribute('data-date', new Date(timer.date).toLocaleDateString()); // Set the date for the hover effect

    // marker = full width space
    let marker = '\u2003';
    // Add a class to indicate whether the event is shown on the main screen
    if (timer.showOnMainScreen) {
      li.classList.add('shown-on-main');
      // show a check mark
      marker = '✔';
    } else {
      li.classList.add('not-shown-on-main');
    }

    const eventNameSpan = document.createElement('span');
    eventNameSpan.textContent = `${timer.name} - ${Math.ceil((new Date(timer.date) - new Date()) / (1000 * 60 * 60 * 24))} days`;

    li.appendChild(eventNameSpan);
    sidebarList.appendChild(li);


    // Clicking the event name brings up the edit modal
    li.addEventListener('click', () => showModal(true, index));
  });
}


function renderTimers() {
  timersContainer.innerHTML = '';
  timers.forEach((timer, index) => {
    if (timer.showOnMainScreen) { // Only create elements for timers marked to be shown
      createTimerElement(timer, index);
    }
  });
  renderSidebarEvents(); // Also update the sidebar with all events
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
