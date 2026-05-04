const UNSAVED_CASE_MESSAGE = 'Existem alterações não salvas neste case. Deseja sair mesmo assim?';

function serializeCaseForm(form: HTMLFormElement) {
  const values: string[] = [];

  form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input, textarea, select').forEach((field) => {
    if (!field.name || field.disabled) return;

    if (field instanceof HTMLInputElement) {
      if (['button', 'submit', 'reset'].includes(field.type)) return;
      if ((field.type === 'checkbox' || field.type === 'radio') && !field.checked) return;

      if (field.type === 'file') {
        const files = [...(field.files || [])].map((file) => `${file.name}:${file.size}:${file.lastModified}`);
        values.push(`${field.name}=files:${files.join('|')}`);
        return;
      }
    }

    if (field instanceof HTMLSelectElement && field.multiple) {
      const selectedValues = [...field.selectedOptions].map((option) => option.value).join('|');
      values.push(`${field.name}=${selectedValues}`);
      return;
    }

    values.push(`${field.name}=${field.value}`);
  });

  return values.join('\n');
}

function isCaseFormDirty(form: HTMLFormElement) {
  return serializeCaseForm(form) !== form.dataset.initialCaseState;
}

function hasDirtyCaseForm() {
  return [...document.querySelectorAll<HTMLFormElement>('form[data-case-form]')].some(isCaseFormDirty);
}

function confirmUnsavedChanges() {
  if (!hasDirtyCaseForm()) return true;
  return window.confirm(UNSAVED_CASE_MESSAGE);
}

document.querySelectorAll<HTMLFormElement>('form[data-case-form]').forEach((form) => {
  form.dataset.initialCaseState = serializeCaseForm(form);

  form.addEventListener('case-form-save-start', () => {
    form.dataset.skipUnsavedWarning = 'true';
  });

  form.addEventListener('case-form-save-error', () => {
    form.dataset.skipUnsavedWarning = 'false';
  });

  form.addEventListener('case-form-save-success', () => {
    form.dataset.skipUnsavedWarning = 'true';
    form.dataset.initialCaseState = serializeCaseForm(form);
  });
});

window.addEventListener('beforeunload', (event) => {
  const hasDirtyForm = [...document.querySelectorAll<HTMLFormElement>('form[data-case-form]')]
    .some((form) => form.dataset.skipUnsavedWarning !== 'true' && isCaseFormDirty(form));

  if (!hasDirtyForm) return;

  event.preventDefault();
  event.returnValue = '';
});

document.addEventListener('click', (event) => {
  const link = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href]');
  if (!link || link.target || link.hasAttribute('download')) return;
  if (link.origin !== window.location.origin) return;
  if (link.href === window.location.href || link.hash && link.pathname === window.location.pathname) return;

  if (!confirmUnsavedChanges()) event.preventDefault();
});

document.addEventListener('submit', (event) => {
  const form = event.target as HTMLFormElement | null;
  if (!form || form.matches('[data-case-form], [data-case-delete-form]')) return;

  if (!confirmUnsavedChanges()) event.preventDefault();
});

export {};
