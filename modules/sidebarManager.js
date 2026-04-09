export class SidebarManager {
  constructor() {
    this.isVisible = false;
    this.minSidebarWidth = 320;
    this.maxSidebarWidth = 840;
    this.isResizing = false;
    this.startX = 0;
    this.startWidth = 0;

    this.elements = {
      sidePanel: document.getElementById("events-side-panel"),
      sidebarContainer: document.getElementById("sidebar-container"),
      toggleArrow: document.getElementById("toggle-arrow"),
      overlay: document.getElementById("overlay"),
      resizeHandle: document.getElementById("sidebar-resize-handle")
    };

    const storedWidth = Number(localStorage.getItem("sidebarWidth"));
    const initialWidth = Number.isFinite(storedWidth) ? storedWidth : 450;
    this.setSidebarWidth(initialWidth);

    this.setupEventListeners();
  }

  setupEventListeners() {
    const togglePanel = document.getElementById("toggle-panel");
    togglePanel.addEventListener("click", () => this.toggle());

    if (this.elements.overlay) {
      this.elements.overlay.addEventListener("click", () => {
        if (this.isVisible) {
          this.hide();
        }
      });
    }

    if (this.elements.resizeHandle) {
      this.elements.resizeHandle.addEventListener("pointerdown", (event) => this.startResize(event));
      this.elements.resizeHandle.addEventListener("keydown", (event) => this.handleResizeKeydown(event));
    }

    window.addEventListener("pointermove", (event) => this.onResize(event));
    window.addEventListener("pointerup", () => this.stopResize());
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

  clampWidth(width) {
    const maxByViewport = Math.max(this.minSidebarWidth, window.innerWidth - 52);
    const maxWidth = Math.min(this.maxSidebarWidth, maxByViewport);
    return Math.min(maxWidth, Math.max(this.minSidebarWidth, width));
  }

  setSidebarWidth(width) {
    const clampedWidth = this.clampWidth(width);
    document.documentElement.style.setProperty("--sidebar-width", `${clampedWidth}px`);
    localStorage.setItem("sidebarWidth", String(clampedWidth));
  }

  startResize(event) {
    if (!this.elements.resizeHandle) {
      return;
    }

    event.preventDefault();
    this.isResizing = true;
    this.startX = event.clientX;
    this.startWidth = this.elements.sidebarContainer.getBoundingClientRect().width;
    this.elements.resizeHandle.classList.add("active");
    this.elements.sidebarContainer.style.transition = "none";
    this.elements.resizeHandle.setPointerCapture?.(event.pointerId);
  }

  onResize(event) {
    if (!this.isResizing) {
      return;
    }

    const widthDelta = event.clientX - this.startX;
    this.setSidebarWidth(this.startWidth + widthDelta);
  }

  stopResize() {
    if (!this.isResizing) {
      return;
    }

    this.isResizing = false;
    this.elements.resizeHandle?.classList.remove("active");
    this.elements.sidebarContainer.style.transition = "";
  }

  handleResizeKeydown(event) {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) {
      return;
    }

    event.preventDefault();
    const currentWidth = this.elements.sidebarContainer.getBoundingClientRect().width;
    const offset = event.key === "ArrowRight" ? 16 : -16;
    this.setSidebarWidth(currentWidth + offset);
  }

  isOpen() {
    return this.isVisible;
  }
}
