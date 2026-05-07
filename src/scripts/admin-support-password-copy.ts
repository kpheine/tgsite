const COPY_RESET_DELAY_MS = 1800;

async function copyText(value: string) {
  if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
  await navigator.clipboard.writeText(value);
}

document.addEventListener('click', async (event) => {
  const button = (event.target as Element | null)?.closest<HTMLButtonElement>('[data-support-password-copy]');
  if (!button) return;

  const value = button.dataset.copyValue;
  const label = button.querySelector<HTMLElement>('[data-copy-label]');
  if (!value || !label) return;

  const originalLabel = label.textContent || 'Copiar';
  button.disabled = true;

  try {
    await copyText(value);
    button.classList.add('is-copied');
    label.textContent = 'Copiado!';
  } catch {
    label.textContent = 'Erro ao copiar';
  }

  window.setTimeout(() => {
    button.disabled = false;
    button.classList.remove('is-copied');
    label.textContent = originalLabel;
  }, COPY_RESET_DELAY_MS);
});
