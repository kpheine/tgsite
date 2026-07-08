import { formatBytesLabel, getByteLimit } from './admin-upload-limits';

const FALLBACK_MAX_BYTES = 16 * 1024 * 1024;

const REPLACE_MESSAGE =
  'Tem certeza que deseja substituir o HTML desta página? O conteúdo atual será sobrescrito e não pode ser desfeito. O link continua o mesmo.';

document.querySelectorAll<HTMLFormElement>('[data-shared-page-replace-form]').forEach((form) => {
  const trigger = form.querySelector<HTMLButtonElement>('[data-replace-trigger]');
  const fileInput = form.querySelector<HTMLInputElement>('[data-replace-input]');
  if (!trigger || !fileInput) return;

  const maxBytes = getByteLimit(form, 'maxHtmlBytes', FALLBACK_MAX_BYTES);

  trigger.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;

    if (file.size > maxBytes) {
      window.alert(`O arquivo excede o limite de ${formatBytesLabel(maxBytes)}.`);
      fileInput.value = '';
      return;
    }

    if (window.confirm(REPLACE_MESSAGE)) {
      form.submit();
    } else {
      fileInput.value = '';
    }
  });
});

export {};
