import { formatBytesLabel, getByteLimit } from './admin-upload-limits';

const FALLBACK_MAX_BYTES = 16 * 1024 * 1024;

const form = document.querySelector<HTMLFormElement>('[data-shared-page-form]');
const fileInput = form?.querySelector<HTMLInputElement>('input[type="file"]');
const errorBox = form?.querySelector<HTMLElement>('[data-shared-page-error]');

if (form && fileInput) {
  const maxBytes = getByteLimit(form, 'maxHtmlBytes', FALLBACK_MAX_BYTES);

  const showError = (message: string) => {
    if (!errorBox) return;
    errorBox.textContent = message;
    errorBox.hidden = false;
  };

  const clearError = () => {
    if (!errorBox) return;
    errorBox.textContent = '';
    errorBox.hidden = true;
  };

  fileInput.addEventListener('change', clearError);

  form.addEventListener('submit', (event) => {
    const file = fileInput.files?.[0];
    if (file && file.size > maxBytes) {
      event.preventDefault();
      showError(`O arquivo excede o limite de ${formatBytesLabel(maxBytes)}.`);
    }
  });
}

export {};
