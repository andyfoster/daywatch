export class ModalManager {
  constructor() {
    this.activeModal = null;
    this.overlay = document.getElementById("overlay");
    this.setupOverlayHandler();
  }

  setupOverlayHandler() {
    this.overlay.addEventListener("click", () => {
      // Hide active modal if one exists
      if (this.activeModal) {
        this.hideActiveModal();
      }

      // Also hide sidebar if it's open
      const sidePanel = document.getElementById("events-side-panel");
      if (sidePanel && sidePanel.classList.contains("visible")) {
        // Trigger sidebar close through the sidebar manager
        const sidebarManager = window.sidebarManager;
        if (sidebarManager) {
          sidebarManager.hide();
        }
      }
    });
  }

  showModal(modalId, options = {}) {
    this.hideActiveModal();

    const modal = document.getElementById(modalId);
    if (!modal) {
      console.error(`Modal with id "${modalId}" not found`);
      return;
    }

    // Apply any custom setup
    if (options.setup) {
      options.setup(modal);
    }

    // Show modal and overlay
    modal.classList.add("modal-visible");
    this.overlay.classList.add("overlay-visible");
    this.activeModal = modal;

    // Set focus for accessibility
    const firstInput = modal.querySelector('input, select, textarea, button');
    if (firstInput) {
      firstInput.focus();
    }
  }

  hideActiveModal() {
    if (this.activeModal) {
      this.activeModal.classList.remove("modal-visible");
      this.activeModal = null;
    }

    // Only hide overlay if no sidebar is visible
    if (!document.getElementById("events-side-panel").classList.contains("visible")) {
      this.overlay.classList.remove("overlay-visible");
    }
  }

  hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove("modal-visible");
      if (this.activeModal === modal) {
        this.activeModal = null;
      }
    }

    // Only hide overlay if no sidebar is visible and no active modal
    if (!this.activeModal && !document.getElementById("events-side-panel").classList.contains("visible")) {
      this.overlay.classList.remove("overlay-visible");
    }
  }

  isModalVisible() {
    return this.activeModal !== null;
  }

  getActiveModal() {
    return this.activeModal;
  }
}