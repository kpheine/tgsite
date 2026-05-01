export function getEnv(name: string, fallback = '') {
  return import.meta.env[name] || process.env[name] || fallback;
}
