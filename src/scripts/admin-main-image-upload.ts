function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function initMainImageUpload(root: HTMLElement) {
  const input = root.querySelector<HTMLInputElement>('[data-main-image-input]');
  const button = root.querySelector<HTMLButtonElement>('[data-main-image-button]');
  const zone = root.querySelector<HTMLElement>('[data-main-image-zone]');
  const preview = root.querySelector<HTMLElement>('[data-main-image-preview]');
  const previewImage = root.querySelector<HTMLImageElement>('[data-main-image-preview-img]');
  const currentImage = root.querySelector<HTMLImageElement>('[data-main-image-current-img]');
  const revertButton = root.querySelector<HTMLButtonElement>('[data-main-image-revert]');
  const name = root.querySelector<HTMLElement>('[data-main-image-name]');
  const size = root.querySelector<HTMLElement>('[data-main-image-size]');
  let previewUrl: string | null = null;
  const originalImageSrc = currentImage?.src || '';

  if (!input || !button || !zone || !preview || !name || !size) return;

  function setFile(file: File) {
    if (!file.type.startsWith('image/')) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);

    previewUrl = URL.createObjectURL(file);
    if (currentImage) currentImage.src = previewUrl;
    if (previewImage) previewImage.src = previewUrl;
    name.textContent = file.name;
    size.textContent = formatFileSize(file.size);
    preview.hidden = false;
    if (revertButton) revertButton.hidden = false;
    root.classList.add('has-file');
  }

  function revertFile() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);

    previewUrl = null;
    input.value = '';
    if (currentImage) currentImage.src = originalImageSrc;
    if (previewImage) previewImage.removeAttribute('src');
    name.textContent = '';
    size.textContent = '';
    preview.hidden = true;
    if (revertButton) revertButton.hidden = true;
    root.classList.remove('has-file');
  }

  button.addEventListener('click', () => input.click());
  revertButton?.addEventListener('click', revertFile);

  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (file) setFile(file);
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
    const file = event.dataTransfer?.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    setFile(file);
  });
}

document.querySelectorAll<HTMLElement>('[data-main-image-upload]').forEach(initMainImageUpload);
