// Admin login: the password is checked on the server, never stored in the site code.
const RENDER_API_BASE = 'https://romeli-kids.onrender.com/api';
const TOKEN_KEY = 'adminToken';
const LEGACY_KEY = 'adminAccess';

export function resolveApiBase() {
  if (window.__API_BASE__) return window.__API_BASE__;
  return window.location.hostname.endsWith('vercel.app') ? RENDER_API_BASE : '/api';
}

export function getToken() {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return '';
    const { token, expiresAt } = JSON.parse(raw);
    if (!token || !expiresAt || expiresAt <= Date.now()) {
      localStorage.removeItem(TOKEN_KEY);
      return '';
    }
    return token;
  } catch {
    return '';
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(LEGACY_KEY);
  } catch {}
}

export function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Returns { ok: true } or { ok: false, message }.
export async function login(password) {
  try {
    const res = await fetch(`${resolveApiBase()}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const body = await res.json().catch(() => ({}));

    if (res.ok && body.token) {
      try {
        localStorage.setItem(TOKEN_KEY, JSON.stringify({ token: body.token, expiresAt: body.expiresAt }));
        localStorage.removeItem(LEGACY_KEY);
      } catch {}
      return { ok: true };
    }
    if (res.status === 401) return { ok: false, message: 'Неправильний пароль.' };
    if (res.status === 429) return { ok: false, message: 'Забагато спроб. Спробуйте через 15 хвилин.' };
    if (res.status === 503) return { ok: false, message: 'На сервері не налаштовано пароль (ADMIN_PASSWORD на Render).' };
    return { ok: false, message: body.message || `Помилка сервера (HTTP ${res.status}).` };
  } catch {
    return { ok: false, message: 'Немає зв’язку з сервером. Спробуйте ще раз за хвилину.' };
  }
}
