export { formatBytesLabel } from '../lib/bytes';

export function getByteLimit(root: HTMLElement, dataName: string, fallback: number) {
  const value = Number(root.dataset[dataName]);
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}
