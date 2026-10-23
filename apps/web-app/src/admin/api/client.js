const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'https://trust-near.onrender.com/api'

export async function request(path, options = {}) {
  const token =
    localStorage.getItem('token') ||
    localStorage.getItem('trustnear_admin_token')

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}))
    throw new Error(errorBody.message || `Request failed: ${res.status}`)
  }

  return res.json()
}

const apiClient = {
  get: (path, options) => request(path, { method: 'GET', ...options }),
  post: (path, body, options) =>
    request(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    }),
  patch: (path, body, options) =>
    request(path, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    }),
  put: (path, body, options) =>
    request(path, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    }),
  delete: (path, options) => request(path, { method: 'DELETE', ...options }),
}

export default apiClient
