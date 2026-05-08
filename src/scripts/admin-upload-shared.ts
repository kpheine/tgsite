export type ImageValidationResult = 'invalid-type' | 'oversized' | null;

export function setInputFiles(input: HTMLInputElement, files: File[]) {
  const transfer = new DataTransfer();
  for (const file of files) transfer.items.add(file);
  input.files = transfer.files;
}

export function setUploadMessage(message: HTMLElement | null, text: string | null) {
  if (!message) return;
  message.textContent = text || '';
  message.hidden = !text;
}

export function validateImageFile(file: File, maxImageBytes: number): ImageValidationResult {
  if (!file.type.startsWith('image/')) return 'invalid-type';
  if (file.size > maxImageBytes) return 'oversized';
  return null;
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function bindUploadDropZone(zone: HTMLElement, onDrop: (files: FileList) => void) {
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
    const files = event.dataTransfer?.files;
    if (files) onDrop(files);
  });
}
