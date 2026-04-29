const OPEN_ATTRIBUTE = 'data-modal-open';
const CLOSE_ATTRIBUTE = 'data-modal-close';
const MODAL_SELECTOR = 'dialog[data-modal]';
const MODAL_TRANSITION_MS = 180;

const lastFocusedByModal = new WeakMap<HTMLDialogElement, HTMLElement>();
const closeTimers = new WeakMap<HTMLDialogElement, number>();

function getTransitionDuration() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : MODAL_TRANSITION_MS;
}

function getModal(id: string): HTMLDialogElement | null {
  const element = document.getElementById(id);

  if (element instanceof HTMLDialogElement && element.matches(MODAL_SELECTOR)) {
    return element;
  }

  return null;
}

function syncScrollLock() {
  const hasOpenModal = Boolean(document.querySelector(`${MODAL_SELECTOR}[open]`));
  const root = document.documentElement;

  if (hasOpenModal) {
    if (!root.classList.contains('has-open-modal')) {
      const scrollbarWidth = window.innerWidth - root.clientWidth;
      root.style.setProperty('--modal-scrollbar-width', `${Math.max(scrollbarWidth, 0)}px`);
    }

    root.classList.add('has-open-modal');
    return;
  }

  root.classList.remove('has-open-modal');
  root.style.removeProperty('--modal-scrollbar-width');
}

function openModal(modal: HTMLDialogElement, trigger?: HTMLElement) {
  if (trigger) {
    lastFocusedByModal.set(modal, trigger);
  }

  const closeTimer = closeTimers.get(modal);

  if (closeTimer) {
    window.clearTimeout(closeTimer);
    closeTimers.delete(modal);
  }

  modal.classList.remove('is-closing');

  if (!modal.open) {
    modal.showModal();
  }

  requestAnimationFrame(() => {
    if (modal.open && !modal.classList.contains('is-closing')) {
      modal.classList.add('is-open');
    }
  });

  syncScrollLock();
}

function closeModal(modal: HTMLDialogElement) {
  if (!modal.open || modal.classList.contains('is-closing')) {
    return;
  }

  modal.classList.remove('is-open');
  modal.classList.add('is-closing');

  const closeTimer = window.setTimeout(() => {
    closeTimers.delete(modal);
    modal.close();
  }, getTransitionDuration());

  closeTimers.set(modal, closeTimer);
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

document.addEventListener('cancel', (event) => {
  const target = event.target;

  if (!(target instanceof HTMLDialogElement) || !target.matches(MODAL_SELECTOR)) {
    return;
  }

  event.preventDefault();
  closeModal(target);
});

document.addEventListener('close', (event) => {
  const target = event.target;

  if (!(target instanceof HTMLDialogElement) || !target.matches(MODAL_SELECTOR)) {
    return;
  }

  target.classList.remove('is-open', 'is-closing');
  restoreFocus(target);
  syncScrollLock();
}, true);
