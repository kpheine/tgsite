type PendingUpload = {
  id: string;
  file: File;
  previewUrl: string;
  destaque: boolean;
};

const imageInputFiles = new WeakMap<HTMLInputElement, PendingUpload[]>();

function syncFileInput(input: HTMLInputElement, uploads: PendingUpload[]) {
  const transfer = new DataTransfer();
  for (const upload of uploads) transfer.items.add(upload.file);
  input.files = transfer.files;
}

function getImageCards(container: HTMLElement) {
  return [...container.querySelectorAll<HTMLElement>('[data-image-card], [data-upload-card]')];
}

function getCardAfterPointer(container: HTMLElement, x: number, y: number) {
  const cards = getImageCards(container).filter((card) => !card.classList.contains('is-dragging'));

  return cards.find((card) => {
    const box = card.getBoundingClientRect();
    const centerX = box.left + box.width / 2;

    if (y < box.top) return true;
    return y <= box.bottom && x < centerX;
  }) || null;
}

function updateImageOrder(list: HTMLElement) {
  getImageCards(list).forEach((card, index) => {
    const orderInput = card.querySelector<HTMLInputElement>('[data-image-order]');
    if (orderInput) orderInput.value = String(index);
  });
}

function updateDestaqueState(card: HTMLElement, isActive: boolean) {
  const input = card.querySelector<HTMLInputElement>('[data-destaque-input]');
  const button = card.querySelector<HTMLButtonElement>('[data-destaque-toggle]');

  if (input) input.value = isActive ? '1' : '0';
  card.classList.toggle('is-featured', isActive);
  button?.classList.toggle('is-active', isActive);
  button?.setAttribute('aria-pressed', isActive ? 'true' : 'false');
}

function createUploadCard(template: HTMLTemplateElement, upload: PendingUpload) {
  const card = template.content.firstElementChild?.cloneNode(true) as HTMLElement | null;
  if (!card) return null;

  card.draggable = true;
  card.dataset.uploadCard = '';
  card.dataset.uploadId = upload.id;

  const image = card.querySelector<HTMLImageElement>('[data-upload-preview]');
  if (!image) return null;

  image.src = upload.previewUrl;
  image.alt = '';

  const removeButton = card.querySelector<HTMLButtonElement>('[data-remove-upload]');
  if (removeButton) removeButton.dataset.removeUpload = upload.id;

  updateDestaqueState(card, upload.destaque);
  return card;
}

function syncUploadState(root: HTMLElement, input: HTMLInputElement, list: HTMLElement) {
  const uploads = imageInputFiles.get(input) || [];
  const orderedIds = getImageCards(list)
    .filter((card) => card.matches('[data-upload-card]'))
    .map((card) => card.dataset.uploadId);
  const orderedUploads = orderedIds
    .map((id) => uploads.find((upload) => upload.id === id))
    .filter((upload): upload is PendingUpload => Boolean(upload));

  imageInputFiles.set(input, orderedUploads);
  root.classList.toggle('has-files', uploads.length > 0);
  syncFileInput(input, orderedUploads);
  updateImageOrder(list);
}

function addUploads(root: HTMLElement, input: HTMLInputElement, list: HTMLElement, template: HTMLTemplateElement, files: FileList | File[]) {
  const uploads = imageInputFiles.get(input) || [];

  for (const file of [...files]) {
    if (!file.type.startsWith('image/')) continue;
    const upload = {
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      destaque: false,
    };

    uploads.push(upload);
    const card = createUploadCard(template, upload);
    if (card) list.append(card);
  }

  imageInputFiles.set(input, uploads);
  syncUploadState(root, input, list);
}

function initImageUpload(root: HTMLElement) {
  const input = root.querySelector<HTMLInputElement>('[data-upload-input]');
  const button = root.querySelector<HTMLButtonElement>('[data-upload-button]');
  const zone = root.querySelector<HTMLElement>('[data-upload-zone]');
  const list = root.querySelector<HTMLElement>('[data-image-list]');
  const template = root.querySelector<HTMLTemplateElement>('[data-upload-card-template]');

  if (!input || !button || !zone || !list || !template) return;
  imageInputFiles.set(input, []);
  updateImageOrder(list);

  let draggedCard: HTMLElement | null = null;

  button.addEventListener('click', () => input.click());

  input.addEventListener('change', () => {
    if (input.files) addUploads(root, input, list, template, input.files);
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
    if (event.dataTransfer?.files) addUploads(root, input, list, template, event.dataTransfer.files);
  });

  list.addEventListener('click', (event) => {
    const destaqueButton = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-destaque-toggle]');
    if (destaqueButton) {
      const card = destaqueButton.closest<HTMLElement>('[data-image-card], [data-upload-card]');
      if (!card) return;

      const upload = card.matches('[data-upload-card]')
        ? imageInputFiles.get(input)?.find((item) => item.id === card.dataset.uploadId)
        : null;

      const inputValue = card.querySelector<HTMLInputElement>('[data-destaque-input]');
      const isActive = inputValue?.value !== '1';

      if (upload) upload.destaque = isActive;
      updateDestaqueState(card, isActive);
      return;
    }

    const removeExistingButton = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-remove-existing]');
    if (removeExistingButton) {
      const card = removeExistingButton.closest<HTMLElement>('[data-image-card]');
      const input = card?.querySelector<HTMLInputElement>('[data-remove-image-input]');
      const banner = card?.querySelector<HTMLElement>('[data-card-banner]');
      if (!card || !input || !banner) return;

      const willRemove = input.disabled;
      input.disabled = !willRemove;
      card.classList.toggle('is-removing', willRemove);
      banner.hidden = !willRemove;
      removeExistingButton.classList.toggle('admin-image-action--remove', !willRemove);
      removeExistingButton.classList.toggle('admin-image-action--restore', willRemove);
      removeExistingButton.textContent = willRemove ? 'Restaurar' : 'Remover';
      return;
    }

    const removeButton = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-remove-upload]');
    if (!removeButton) return;

    const uploads = imageInputFiles.get(input) || [];
    const nextUploads = uploads.filter((upload) => {
      if (upload.id !== removeButton.dataset.removeUpload) return true;
      URL.revokeObjectURL(upload.previewUrl);
      return false;
    });

    const card = removeButton.closest<HTMLElement>('[data-upload-card]');
    card?.remove();
    imageInputFiles.set(input, nextUploads);
    syncUploadState(root, input, list);
  });

  list.addEventListener('dragstart', (event) => {
    const card = (event.target as HTMLElement).closest<HTMLElement>('[data-image-card], [data-upload-card]');
    if (!card) return;

    draggedCard = card;
    const rect = card.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;

    event.dataTransfer?.setData('text/plain', '');
    event.dataTransfer?.setDragImage(card, offsetX, offsetY);
    requestAnimationFrame(() => card.classList.add('is-dragging'));
  });

  list.addEventListener('dragover', (event) => {
    event.preventDefault();
    if (!draggedCard) return;

    const afterCard = getCardAfterPointer(list, event.clientX, event.clientY);
    if (afterCard) list.insertBefore(draggedCard, afterCard);
    else list.appendChild(draggedCard);
  });

  list.addEventListener('dragend', () => {
    draggedCard?.classList.remove('is-dragging');
    draggedCard = null;
    syncUploadState(root, input, list);
  });

  list.addEventListener('drop', (event) => {
    event.preventDefault();
    syncUploadState(root, input, list);
  });
}

document.querySelectorAll<HTMLElement>('[data-image-upload]').forEach(initImageUpload);
