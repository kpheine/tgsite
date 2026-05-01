const MAX_VIDEO_BYTES = 80 * 1024 * 1024;

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function setInputFile(input: HTMLInputElement, file: File | null) {
  const transfer = new DataTransfer();
  if (file) transfer.items.add(file);
  input.files = transfer.files;
}

function setMessage(message: HTMLElement | null, text: string | null) {
  if (!message) return;
  message.textContent = text || '';
  message.hidden = !text;
}

function initVideoUpload(root: HTMLElement) {
  const input = root.querySelector<HTMLInputElement>('[data-video-input]');
  const buttons = root.querySelectorAll<HTMLButtonElement>('[data-video-button]');
  const zone = root.querySelector<HTMLElement>('[data-video-zone]');
  const preview = root.querySelector<HTMLElement>('[data-video-preview]');
  const player = root.querySelector<HTMLVideoElement>('[data-video-preview-player]');
  const name = root.querySelector<HTMLElement>('[data-video-name]');
  const size = root.querySelector<HTMLElement>('[data-video-size]');
  const type = root.querySelector<HTMLElement>('[data-video-type]');
  const removeSelection = root.querySelector<HTMLButtonElement>('[data-video-remove-selection]');
  const message = root.querySelector<HTMLElement>('[data-video-message]');
  const removeCurrentInput = root.querySelector<HTMLInputElement>('[data-remove-current-video-input]');
  const removeCurrentButton = root.querySelector<HTMLButtonElement>('[data-remove-current-video]');
  const currentCard = root.querySelector<HTMLElement>('[data-current-video-card]');
  const currentBanner = root.querySelector<HTMLElement>('[data-current-video-banner]');

  if (!input || !zone || !preview || !player) return;

  let previewUrl: string | null = null;
  const removeSelectionText = removeSelection?.textContent || 'Remover seleção';

  function clearSelection() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null;
    player.removeAttribute('src');
    player.load();
    preview.hidden = true;
    setInputFile(input, null);
    setMessage(message, null);
    root.classList.remove('has-video-file');
    root.classList.remove('is-replacing-video');
    if (currentCard) currentCard.hidden = false;
    if (removeSelection) removeSelection.textContent = removeSelectionText;
    setCurrentRemoval(false);
  }

  function selectFile(file: File | null) {
    setMessage(message, null);

    if (!file) {
      clearSelection();
      return;
    }

    if (!file.type.startsWith('video/')) {
      clearSelection();
      setMessage(message, 'Selecione um arquivo de vídeo válido.');
      return;
    }

    if (file.size > MAX_VIDEO_BYTES) {
      clearSelection();
      setMessage(message, 'O vídeo excede o limite de 80MB.');
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(file);
    setInputFile(input, file);

    if (name) name.textContent = file.name;
    if (size) size.textContent = formatFileSize(file.size);
    if (type) type.textContent = file.type || 'Tipo não informado';

    player.src = previewUrl;
    preview.hidden = false;
    root.classList.add('has-video-file');

    if (currentCard) {
      currentCard.hidden = true;
      root.classList.add('is-replacing-video');
      if (removeSelection) removeSelection.textContent = 'Cancelar';
    }
  }

  function setCurrentRemoval(willRemove: boolean) {
    if (!removeCurrentInput || !removeCurrentButton || !currentCard) return;

    removeCurrentInput.disabled = !willRemove;
    currentCard.classList.toggle('is-removing', willRemove);
    removeCurrentButton.classList.toggle('admin-image-action--remove', !willRemove);
    removeCurrentButton.classList.toggle('admin-image-action--restore', willRemove);
    removeCurrentButton.textContent = willRemove ? 'Restaurar vídeo atual' : 'Remover vídeo atual';
    if (currentBanner) currentBanner.hidden = !willRemove;
  }

  buttons.forEach((button) => button.addEventListener('click', () => input.click()));
  removeSelection?.addEventListener('click', clearSelection);
  removeCurrentButton?.addEventListener('click', () => {
    setCurrentRemoval(removeCurrentInput?.disabled ?? false);
  });

  input.addEventListener('change', () => {
    selectFile(input.files?.[0] || null);
  });

  for (const eventName of ['dragenter', 'dragover']) {
    zone.addEventListener(eventName, (event) => {
      event.preventDefault();
      zone.classList.add('is-drag-over');
    });
  }

  for (const eventName of ['dragleave', 'drop']) {
    zone.addEventListener(eventName, (event) => {
      event.preventDefault();
      zone.classList.remove('is-drag-over');
    });
  }

  zone.addEventListener('drop', (event) => {
    selectFile(event.dataTransfer?.files?.[0] || null);
  });
}

document.querySelectorAll<HTMLElement>('[data-video-upload]').forEach(initVideoUpload);
