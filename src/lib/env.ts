const ENV_DEFAULTS = {
  adminPath: '/painel-tg-2026',
  adminUsername: 'admin',
  adminPasswordPlaceholder: 'change-this-password',
  sessionSecretPlaceholder: 'replace-with-a-long-random-secret',
  uploadMaxImageBytes: 8 * 1024 * 1024,
};

function readEnv(name: string, fallback = '') {
  return import.meta.env[name] || process.env[name] || fallback;
}

function readRequiredEnv(name: string, setupMessage: string) {
  const value = readEnv(name);

  if (!value) {
    throw new Error(`${name} is required. ${setupMessage}`);
  }

  return value;
}

function readPositiveIntegerEnv(name: string, fallback: number) {
  const value = Number(readEnv(name));
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

function readBooleanEnv(name: string, fallback: boolean) {
  const configured = readEnv(name, fallback ? 'true' : 'false').trim().toLowerCase();
  return configured === 'true' || configured === '1';
}

function readAdminPath() {
  return readEnv('ADMIN_PATH', ENV_DEFAULTS.adminPath).replace(/^\/+|\/+$/g, '') || ENV_DEFAULTS.adminPath.replace(/^\/+/, '');
}

function readAdminUsername() {
  return readEnv('ADMIN_USERNAME', ENV_DEFAULTS.adminUsername).trim().toLowerCase() || ENV_DEFAULTS.adminUsername;
}

function readAdminPassword() {
  const password = readRequiredEnv('ADMIN_PASSWORD', 'Set a strong admin password in .env before starting the app.');

  if (password === ENV_DEFAULTS.adminPasswordPlaceholder) {
    throw new Error('ADMIN_PASSWORD must be changed from the default value in .env before starting the app.');
  }

  return password;
}

function readSessionSecret() {
  const secret = readRequiredEnv('SESSION_SECRET', 'Set a strong session secret in .env before starting the app.');

  if (secret === ENV_DEFAULTS.sessionSecretPlaceholder) {
    throw new Error('SESSION_SECRET must be changed from the default value in .env before starting the app.');
  }

  return secret;
}

export const env = {
  adminPath: readAdminPath(),
  adminUsername: readAdminUsername(),
  adminPassword: readAdminPassword(),
  sessionSecret: readSessionSecret(),
  sessionCookieSecure: readBooleanEnv('SESSION_COOKIE_SECURE', import.meta.env.PROD),
  trustProxyHeaders: readBooleanEnv('TRUST_PROXY_HEADERS', true),
  uploadMaxImageBytes: readPositiveIntegerEnv('UPLOAD_MAX_IMAGE_BYTES', ENV_DEFAULTS.uploadMaxImageBytes),
  smtpUser: readEnv('SMTP_USER'),
  smtpPass: readEnv('SMTP_PASS'),
  contactTo: readEnv('CONTACT_TO'),
};
