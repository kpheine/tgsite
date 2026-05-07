import { getYouTubeEmbedUrl } from '../lib/youtube';

function setMessage(message: HTMLElement | null, text: string | null) {
  if (!message) return;
  message.textContent = text || '';
  message.hidden = !text;
}

function initYouTubePreview(root: HTMLElement) {
  const input = root.querySelector<HTMLInputElement>('[data-youtube-url-input]');
  const preview = root.querySelector<HTMLElement>('[data-video-preview]');
  const frame = root.querySelector<HTMLIFrameElement>('[data-youtube-preview-frame]');
  const message = root.querySelector<HTMLElement>('[data-video-message]');

  if (!input || !preview || !frame) return;

  function updatePreview() {
    const value = input?.value.trim() || '';
    const embedUrl = getYouTubeEmbedUrl(value);

    if (!value) {
      frame.removeAttribute('src');
      preview.hidden = true;
      setMessage(message, null);
      return;
    }

    if (!embedUrl) {
      frame.removeAttribute('src');
      preview.hidden = true;
      setMessage(message, 'Informe uma URL válida do YouTube.');
      return;
    }

    frame.src = embedUrl;
    preview.hidden = false;
    setMessage(message, null);
  }

  input.addEventListener('input', updatePreview);
  input.addEventListener('change', updatePreview);
  updatePreview();
}

document.querySelectorAll<HTMLElement>('[data-youtube-preview]').forEach(initYouTubePreview);

export {};
