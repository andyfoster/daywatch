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

document.getElementById('add-dummy-timer-btn').addEventListener('click', () => {
  createDummyTimer();
});

let timers = JSON.parse(localStorage.getItem('timers')) || [];

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
  // Style timers container
  // timersContainer.style.display = 'flex';
  // timersContainer.style.flexWrap = 'wrap';
  // timersContainer.style.justifyContent = 'center';
  // timersContainer.style.alignItems = 'center';
};

// function showModal(isEdit = false, index) {
//   modalTitle.textContent = isEdit ? 'Edit Timer' : 'Add Timer';
//   // modalTitle.textContent = 'Add Timer';
//   eventNameInput.value = '';
//   eventDateInput.value = '';
//   eventColorInput.value = '#000000';
//   timerModal.style.display = 'block';

//   if (isEdit) {
//     removeBtn.style.display = 'block';
//     removeBtn.onclick = () => {
//       removeTimer(index);
//       hideModal();
//     };
//   } else {
//     removeBtn.style.display = 'none';
//   }
// }
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

// removeTimer() should delete a single timer from the timers array
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

// Function to create dummy timer for testing
function createDummyTimer() {
  // Create a nonsense string for the name
  const nonsense = Math.random().toString(36).substring(2, 15);
  // random color
  const randomColor = Math.floor(Math.random() * 16777215).toString(16);

  // random date in the next two years
  const randomDate =
    new Date().getTime() + Math.random() * 1000 * 60 * 60 * 24 * 365 * 2;

  const timer = {
    name: nonsense,
    date: randomDate,
    color: '#' + randomColor,
  };
  timers.push(timer);
  updateTimers();
}

function createTimerElement(timer, index) {
  const timeRemaining = timer.date - new Date().getTime();
  const daysRemaining = Math.floor(timeRemaining / (1000 * 60 * 60 * 24)) + 1;
  const timerEl = document.createElement('div');
  timerEl.classList.add('timer');
  timerEl.innerHTML = `
    <h2 class="days-remaining">${daysRemaining}</h2>
    <p class="due-date" style="color: ${timer.color};">${timer.name}</p>
    <button class="edit-btn">${new Date(timer.date).toLocaleDateString(
      'en-NZ',
      { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }
    )}</button>

  `;

  // Add event listeners to the buttons
  const editBtn = timerEl.querySelector('.edit-btn');
  editBtn.addEventListener('click', () => {
    showModal(true, index);
    modalTitle.textContent = 'Edit Timer';
    eventNameInput.value = timer.name;
    eventDateInput.value = new Date(timer.date).toISOString().slice(0, 10);
    eventColorInput.value = timer.color;
    handleFormSubmit = () => editTimer(index);
  });

  // const removeBtn = timerEl.querySelector('.remove-btn');
  // removeBtn.addEventListener('click', () => removeTimer(index));

  timersContainer.appendChild(timerEl);
}
