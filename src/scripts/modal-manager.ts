const OPEN_ATTRIBUTE = 'data-modal-open';
const CLOSE_ATTRIBUTE = 'data-modal-close';
const MODAL_SELECTOR = 'dialog[data-modal]';

const lastFocusedByModal = new WeakMap<HTMLDialogElement, HTMLElement>();

function getModal(id: string): HTMLDialogElement | null {
  const element = document.getElementById(id);

  if (element instanceof HTMLDialogElement && element.matches(MODAL_SELECTOR)) {
    return element;
  }

  return null;
}

function syncScrollLock() {
  const hasOpenModal = Boolean(document.querySelector(`${MODAL_SELECTOR}[open]`));
  document.documentElement.classList.toggle('has-open-modal', hasOpenModal);
}

function openModal(modal: HTMLDialogElement, trigger?: HTMLElement) {
  if (trigger) {
    lastFocusedByModal.set(modal, trigger);
  }

  if (!modal.open) {
    modal.showModal();
  }

  syncScrollLock();
}

function closeModal(modal: HTMLDialogElement) {
  if (modal.open) {
    modal.close();
  }
}

function restoreFocus(modal: HTMLDialogElement) {
  const lastFocused = lastFocusedByModal.get(modal);

  if (lastFocused && document.contains(lastFocused)) {
    lastFocused.focus();
  }
}

document.addEventListener('click', (event) => {
  const target = event.target;

  if (!(target instanceof Element)) {
    return;
  }

  const openTrigger = target.closest<HTMLElement>(`[${OPEN_ATTRIBUTE}]`);

  if (openTrigger) {
    const modalId = openTrigger.getAttribute(OPEN_ATTRIBUTE);
    const modal = modalId ? getModal(modalId) : null;

    if (modal) {
      event.preventDefault();
      openModal(modal, openTrigger);
    }

    return;
  }

  const closeTrigger = target.closest<HTMLElement>(`[${CLOSE_ATTRIBUTE}]`);

  if (closeTrigger) {
    const modal = closeTrigger.closest<HTMLDialogElement>(MODAL_SELECTOR);

    if (modal) {
      event.preventDefault();
      closeModal(modal);
    }
  }
});

document.addEventListener('click', (event) => {
  const target = event.target;

  if (!(target instanceof HTMLDialogElement) || !target.matches(MODAL_SELECTOR)) {
    return;
  }

  closeModal(target);
});

document.addEventListener('close', (event) => {
  const target = event.target;

  if (!(target instanceof HTMLDialogElement) || !target.matches(MODAL_SELECTOR)) {
    return;
  }

  restoreFocus(target);
  syncScrollLock();
}, true);
