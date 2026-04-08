export class ModalManager {
  constructor() {
    this.activeModal = null;
    this.modalInstances = new Map();
    this.bootstrap = window.bootstrap;
    this.setupModalListeners();
  }

  setupModalListeners() {
    document.querySelectorAll(".modal").forEach((modalEl) => {
      modalEl.addEventListener("hidden.bs.modal", () => {
        if (this.activeModal === modalEl) {
          this.activeModal = null;
        }
      });
    });
  }

  getModalInstance(modalEl) {
    if (this.modalInstances.has(modalEl)) {
      return this.modalInstances.get(modalEl);
    }

    let instance;
    if (this.bootstrap?.Modal) {
      instance = new this.bootstrap.Modal(modalEl, {
        backdrop: true,
        keyboard: true,
        focus: true
      });
    } else {
      // Fallback for tests or if Bootstrap fails to load
      instance = {
        show: () => {
          modalEl.classList.add("show");
          modalEl.style.display = "block";
        },
        hide: () => {
          modalEl.classList.remove("show");
          modalEl.style.display = "none";
        }
      };
    }

    this.modalInstances.set(modalEl, instance);
    return instance;
  }

  showModal(modalId, options = {}) {
    this.hideActiveModal();

    const modalEl = document.getElementById(modalId);
    if (!modalEl) {
      console.error(`Modal with id "${modalId}" not found`);
      return;
    }

    if (options.setup) {
      options.setup(modalEl);
    }

    this.getModalInstance(modalEl).show();
    this.activeModal = modalEl;
  }

  hideActiveModal() {
    if (this.activeModal) {
      this.getModalInstance(this.activeModal).hide();
      this.activeModal = null;
    }
  }

  hideModal(modalId) {
    const modalEl = document.getElementById(modalId);
    if (!modalEl) {
      return;
    }

    this.getModalInstance(modalEl).hide();
    if (this.activeModal === modalEl) {
      this.activeModal = null;
    }
  }

  isModalVisible() {
    return document.querySelector(".modal.show") !== null;
  }

  getActiveModal() {
    return this.activeModal;
  }
}
