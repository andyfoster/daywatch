diff --git a/script.js b/script.js
index 16d1f65..c005ad7 100644
--- a/script.js
+++ b/script.js
@@ -24,6 +24,7 @@ const togglePanel = document.getElementById('toggle-panel');
 const overlay = document.getElementById('overlay');
 
 overlay.addEventListener('click', toggleSidebar);
+overlay.addEventListener('click', hideModalIfVisible);
 togglePanel.addEventListener('click', toggleSidebar);
 
 const sidebarContainer = document.getElementById('sidebar-container');
@@ -47,6 +48,26 @@ let handleFormSubmit;
 
 let isSidebarVisible = false;
 
+function hideModalIfVisible() {
+  if (timerModal.style.display === 'block') {
+    hideModal();
+  }
+}
+
+// Close the modal if the overlay behind it is clicked
+overlay.addEventListener('click', function(event) {
+  if (event.target === overlay) {
+    hideModal();
+  }
+});
+
+// Function to hide the modal if the click is outside of it
+function hideModalOnClickOutside(event) {
+  if (event.target === timerModal) {
+    hideModal();
+  }
+}
+
 function toggleSidebar() {
   sidePanel.classList.toggle('visible'); // Toggle visibility class
 
@@ -235,7 +256,7 @@ function showModal(isEdit = false, index) {
     eventDateInput.value = new Date(timer.date).toISOString().slice(0, 10);
     eventColorInput.value = timer.color;
     // document.getElementById('show-on-main-screen').checked = timer.showOnMainScreen ?? true; // Default to true if undefined
-    showOnMainScreenCheckbox.checked = timer.showOnMainScreen;
+    showOnMainScreenCheckbox.checked = timer.showOnMainScreen ?? true; // Default to true if undefined
 
     removeBtn.style.display = 'block';
     removeBtn.onclick = () => {
@@ -244,6 +265,7 @@ function showModal(isEdit = false, index) {
     };
 
     handleFormSubmit = (showOnMainScreen) => editTimer(index, showOnMainScreen);
+    handleFormSubmit = (showOnMainScreen) => editTimer(index, showOnMainScreen);
 
   } else {
     removeBtn.style.display = 'none';
@@ -256,6 +278,7 @@ function showModal(isEdit = false, index) {
 }
 
 function hideModal() {
+  overlay.style.display = 'none'; // Hide the overlay when the modal is closed
   timerModal.style.display = 'none';
 }
 
@@ -281,7 +304,9 @@ function editTimer(index, showOnMainScreen) {
   const eventDate = eventDateInput.value;
   const eventColor = eventColorInput.value;
   if (eventName && eventDate) {
+    const existingTimer = timers[index];
     timers[index] = {
+      ...existingTimer,
       name: eventName,
       date: new Date(eventDate).getTime(),
       color: eventColor,
@@ -396,7 +421,7 @@ function createTimerElement(timer, index) {
     eventNameInput.value = timer.name;
     eventDateInput.value = new Date(timer.date).toISOString().slice(0, 10);
     eventColorInput.value = timer.color;
-    handleFormSubmit = () => editTimer(index);
+    handleFormSubmit = () => editTimer(index, timer.showOnMainScreen);
   });
 
   timersContainer.appendChild(timerEl);
