export class SidebarManager {
  constructor() {
    this.isVisible = false;
    this.elements = {
      sidePanel: document.getElementById("events-side-panel"),
      sidebarContainer: document.getElementById("sidebar-container"),
      toggleArrow: document.getElementById("toggle-arrow"),
      overlay: document.getElementById("overlay")
    };

    this.setupEventListeners();
  }

  setupEventListeners() {
    const togglePanel = document.getElementById("toggle-panel");
    togglePanel.addEventListener("click", () => this.toggle());
  }

  toggle() {
    this.elements.sidePanel.classList.toggle("visible");

    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }

    this.isVisible = !this.isVisible;
  }

  show() {
    this.elements.sidebarContainer.style.transform = "translateX(0)";
    this.elements.toggleArrow.textContent = "<";
    this.elements.overlay.classList.add("overlay-visible");
  }

  hide() {
    this.elements.sidebarContainer.style.transform = "translateX(-100%)";
    this.elements.toggleArrow.textContent = ">";
    this.elements.sidePanel.classList.remove("visible");
    this.isVisible = false;

    // Only hide overlay if no modal is visible
    const modalManager = window.modalManager;
    if (!modalManager || !modalManager.isModalVisible()) {
      this.elements.overlay.classList.remove("overlay-visible");
    }
  }

  isOpen() {
    return this.isVisible;
  }
}