const caseForms = document.querySelectorAll<HTMLFormElement>('form[data-case-form]');
const modal = document.querySelector<HTMLElement>('[data-case-upload-modal]');
const ring = document.querySelector<HTMLElement>('[data-upload-progress-ring]');
const percent = document.querySelector<HTMLElement>('[data-upload-progress-percent]');
const title = document.querySelector<HTMLElement>('[data-upload-progress-title]');
const message = document.querySelector<HTMLElement>('[data-upload-progress-message]');
const closeButton = document.querySelector<HTMLButtonElement>('[data-upload-progress-close]');

let activeRequest: XMLHttpRequest | null = null;

function setProgress(value: number) {
  const safeValue = Math.min(100, Math.max(0, Math.round(value)));
  ring?.style.setProperty('--upload-progress', `${safeValue}%`);
  if (percent) percent.textContent = `${safeValue}%`;
}

function setModalCopy(nextTitle: string, nextMessage: string) {
  if (title) title.textContent = nextTitle;
  if (message) message.textContent = nextMessage;
}

function showModal() {
  if (!modal) return;

  modal.hidden = false;
  modal.classList.remove('is-error');
  closeButton?.setAttribute('hidden', '');
  document.body.style.overflow = 'hidden';
  setProgress(0);
  setModalCopy('Enviando arquivos', 'Não feche esta página até o envio terminar.');
}

function showError(text: string) {
  if (!modal) return;

  activeRequest = null;
  modal.classList.add('is-error');
  setProgress(100);
  if (percent) percent.textContent = 'Erro';
  setModalCopy('Não foi possível salvar', text || 'Tente novamente em alguns instantes.');
  closeButton?.removeAttribute('hidden');
  closeButton?.focus();
}

function hideModal() {
  if (!modal) return;

  modal.hidden = true;
  modal.classList.remove('is-error');
  document.body.style.overflow = '';
}

function setFormDisabled(form: HTMLFormElement, isDisabled: boolean) {
  form.querySelectorAll<HTMLButtonElement>('button').forEach((button) => {
    button.disabled = isDisabled;
  });
}

function getFailureMessage(request: XMLHttpRequest) {
  const body = request.responseText?.trim();
  if (body && body.length < 220) return body;
  if (request.status === 413) return 'Os arquivos selecionados excedem o limite permitido.';
  if (request.status >= 500) return 'O servidor encontrou um erro ao processar os arquivos.';
  return 'Confira os dados do case e tente novamente.';
}

function redirectAfterSuccess(request: XMLHttpRequest, form: HTMLFormElement) {
  const target = request.responseURL || form.action;
  window.location.assign(target);
}

function submitCaseForm(form: HTMLFormElement) {
  if (activeRequest) return;

  const request = new XMLHttpRequest();
  activeRequest = request;
  setFormDisabled(form, true);
  showModal();

  request.upload.addEventListener('progress', (event) => {
    if (!event.lengthComputable) {
      setModalCopy('Enviando arquivos', 'Aguarde enquanto os arquivos são enviados.');
      return;
    }

    const currentProgress = (event.loaded / event.total) * 100;
    setProgress(currentProgress);

    if (currentProgress >= 100) {
      setModalCopy('Processando alterações...', 'Salvando o case no painel.');
    }
  });

  request.addEventListener('load', () => {
    activeRequest = null;
    setProgress(100);

    if (request.status >= 200 && request.status < 400) {
      setModalCopy('Processando alterações...', 'Salvando o case no painel.');
      redirectAfterSuccess(request, form);
      return;
    }

    setFormDisabled(form, false);
    showError(getFailureMessage(request));
  });

  request.addEventListener('error', () => {
    setFormDisabled(form, false);
    showError('Verifique sua conexão e tente novamente.');
  });

  request.addEventListener('abort', () => {
    setFormDisabled(form, false);
    showError('O envio foi interrompido. Tente salvar novamente.');
  });

  request.open(form.method || 'POST', form.action);
  request.setRequestHeader('Accept', 'text/html');
  request.send(new FormData(form));
}

closeButton?.addEventListener('click', hideModal);

caseForms.forEach((form) => {
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    submitCaseForm(form);
  });
});
