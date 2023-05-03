// Get the timers container and add event listener for add timer button
const timersContainer = document.getElementById('timers-container');
const addTimerBtn = document.getElementById('add-timer-btn');
addTimerBtn.addEventListener('click', showModal);

// Get the timer modal and its elements
const timerModal = document.getElementById('timer-modal');
const modalTitle = document.getElementById('modal-title');
const timerForm = document.getElementById('timer-form');
const eventNameInput = document.getElementById('event-name');
const eventDateInput = document.getElementById('event-date');

// Create an empty array to store the timers
let timers = [];

// Load the timers from local storage if they exist
if (localStorage.getItem('timers')) {
  timers = JSON.parse(localStorage.getItem('timers'));
  renderTimers();
}

// Show the timer modal
function showModal() {
  modalTitle.textContent = 'Add Timer';
  eventNameInput.value = '';
  eventDateInput.value = '';
  timerModal.style.display = 'block';
}

// Hide the timer modal
function hideModal() {
  timerModal.style.display = 'none';
}

// Add a new timer to the array and render it on the page
function addTimer(eventName, eventDate) {
  const timer = {
    name: eventName,
    date: new Date(eventDate).getTime(),
  };

  timers.push(timer);
  localStorage.setItem('timers', JSON.stringify(timers));
  renderTimers();
}

// Remove a timer from the array and render the updated timers on the page
function removeTimer(index) {
  timers.splice(index, 1);
  localStorage.setItem('timers', JSON.stringify(timers));
  renderTimers();
}

// Render the timers on the page
function renderTimers() {
  timersContainer.innerHTML = '';

  timers.forEach((timer, index) => {
    // Calculate the time remaining
    const now = new Date().getTime();
    const timeRemaining = timer.date - now;
    const daysRemaining = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));

    // Create a timer element
    const timerEl = document.createElement('div');
    timerEl.classList.add('timer');

    // Create a header element for the timer name
    const timerNameEl = document.createElement('h2');
    timerNameEl.textContent = timer.name;
    timerEl.appendChild(timerNameEl);

    // Create a paragraph element for the date and days remaining
    const timerDateEl = document.createElement('p');
    timerDateEl.textContent = `${new Date(
      timer.date
    ).toLocaleDateString()} (${daysRemaining} days remaining)`;
    timerEl.appendChild(timerDateEl);

    // Create a button element to remove the timer
    const removeBtn = document.createElement('button');
    removeBtn.classList.add('remove-btn');
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => {
      removeTimer(index);
    });
    timerEl.appendChild(removeBtn);

    timersContainer.appendChild(timerEl);
  });
}

// Add event listener for the timer form submission
timerForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const eventName = eventNameInput.value.trim();
  const eventDate = eventDateInput.value;
  if (eventName && eventDate) {
    addTimer(eventName, eventDate);
    hideModal();
  }
});

// Add event listener for the modal close button
const closeBtn = document.querySelector('.close');
closeBtn.addEventListener('click', hideModal);

// Use flexbox to lay out the timers
timersContainer.style.display = 'flex';
timersContainer.style.flexWrap = 'wrap';
timersContainer.style.justifyContent = 'center';
timersContainer.style.alignItems = 'center';

// Add some basic styling to the timers
const style = document.createElement('style');
style.textContent = `
.container {
text-align: center;
}

.timer {
background-color: #f5f5f5;
border: 1px solid #ddd;
border-radius: 5px;
padding: 20px;
margin: 10px;
text-align: center;
width: 300px;
}

.remove-btn {
background-color: #f44336;
border: none;
color: white;
padding: 8px 16px;
text-align: center;
text-decoration: none;
display: inline-block;
font-size: 14px;
margin-top: 10px;
cursor: pointer;
border-radius: 4px;
}

.remove-btn:hover {
background-color: #ff6659;
}

.modal {
display: none;
position: fixed;
z-index: 1;
left: 0;
top: 0;
width: 100%;
height: 100%;
overflow: auto;
background-color: rgba(0,0,0,0.4);
}

.modal-content {
background-color: #fefefe;
margin: 15% auto;
padding: 20px;
border: 1px solid #888;
width: 80%;
}

.close {
color: #


.aaaaaa;
float: right;
font-size: 28px;
font-weight: bold;
margin-right: 5px;
margin-top: 3px;
cursor: pointer;
}

.close:hover {
color: #000;
}
`;

document.head.appendChild(style);
