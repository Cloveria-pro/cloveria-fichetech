export const API_URL = 'https://cloveria-fichetech.onrender.com/api';

function getToken() {
  return localStorage.getItem('token');
}

export function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...options.headers },
    ...options
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.message || 'Erreur de communication');
  return body;
}

export const auth = {
  login: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) })
};

export const api = {
  health: () => fetch(`${API_URL}/health`).then((r) => r.json()),
  dashboard: () => Promise.all([request('/recettes'), request('/cartes')]),
  ingredients: {
    list: () => request('/ingredients'),
    create: (data) => request('/ingredients', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/ingredients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/ingredients/${id}`, { method: 'DELETE' })
  },
  recettes: {
    list: () => request('/recettes'),
    get: (id) => request(`/recettes/${id}`),
    create: (data) => request('/recettes', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/recettes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    updatePrix: (id, prix) => request(`/recettes/${id}/prix`, { method: 'PUT', body: JSON.stringify({ prix }) }),
    delete: (id) => request(`/recettes/${id}`, { method: 'DELETE' })
  },
  cartes: {
    list: () => request('/cartes'),
    get: (id) => request(`/cartes/${id}`),
    create: (data) => request('/cartes', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/cartes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/cartes/${id}`, { method: 'DELETE' })
  },
  parametres: {
    get: () => request('/parametres'),
    update: (data) => request('/parametres', { method: 'PUT', body: JSON.stringify(data) })
  },
  ia: {
    structurer: (description) => request('/ia/structurer', { method: 'POST', body: JSON.stringify({ description }) }),
    descriptionCommerciale: (data) => request('/ia/description-commerciale', { method: 'POST', body: JSON.stringify(data) }),
  },
  aliases: {
    list: () => request('/aliases'),
    create: (data) => request('/aliases', { method: 'POST', body: JSON.stringify(data) }),
  },
  historiquePrix: {
    list: (nom) => request('/historique-prix' + (nom ? `?nom=${encodeURIComponent(nom)}` : '')),
    create: (data) => request('/historique-prix', { method: 'POST', body: JSON.stringify(data) }),
    delete: (nom, date) => request(`/historique-prix?nom=${encodeURIComponent(nom)}&date=${encodeURIComponent(date)}`, { method: 'DELETE' }),
  },
  sousRecettes: {
    list: () => request('/sous-recettes'),
    get: (id) => request(`/sous-recettes/${id}`),
    create: (data) => request('/sous-recettes', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/sous-recettes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/sous-recettes/${id}`, { method: 'DELETE' }),
  },
};

export function saveToken(token) {
  localStorage.setItem('token', token);
}

export function clearToken() {
  localStorage.removeItem('token');
}

export function isAuthenticated() {
  return !!getToken();
}
