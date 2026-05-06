export function formatBytesLabel(bytes: number) {
  const units = [
    { value: 1024 * 1024 * 1024, suffix: 'GB' },
    { value: 1024 * 1024, suffix: 'MB' },
    { value: 1024, suffix: 'KB' },
  ];

  const unit = units.find((item) => bytes >= item.value);
  if (!unit) return `${bytes}B`;

  const value = bytes / unit.value;
  return `${Number.isInteger(value) ? value : value.toFixed(1)}${unit.suffix}`;
}
