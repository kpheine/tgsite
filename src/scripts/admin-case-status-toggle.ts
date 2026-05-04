function initStatusToggle(root: HTMLElement) {
  const input = root.querySelector<HTMLInputElement>('[data-status-toggle-input]');
  const button = root.querySelector<HTMLButtonElement>('[data-status-toggle]');
  const label = root.querySelector<HTMLElement>('[data-status-toggle-label]');

  if (!input || !button || !label) return;

  button.addEventListener('click', () => {
    const isPublished = input.value !== 'published';

    input.value = isPublished ? 'published' : 'draft';
    button.setAttribute('aria-pressed', isPublished ? 'true' : 'false');
    label.textContent = isPublished ? 'Publicado' : 'Rascunho';
  });
}

document.querySelectorAll<HTMLElement>('[data-status-toggle-field]').forEach(initStatusToggle);

export {};
