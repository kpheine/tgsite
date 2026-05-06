import { getEnv } from './env';

const DEFAULT_MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const DEFAULT_MAX_VIDEO_BYTES = 2 * 1024 * 1024 * 1024;

function getPositiveIntegerEnv(name: string, fallback: number) {
  const value = Number(getEnv(name));
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

export const MAX_IMAGE_BYTES = getPositiveIntegerEnv('UPLOAD_MAX_IMAGE_BYTES', DEFAULT_MAX_IMAGE_BYTES);
export const MAX_VIDEO_BYTES = getPositiveIntegerEnv('UPLOAD_MAX_VIDEO_BYTES', DEFAULT_MAX_VIDEO_BYTES);
