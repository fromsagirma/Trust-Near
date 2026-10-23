import apiClient from './client'

// TN-001 / TN-TECH-005 — Authentication & Admin Session
export async function login(emailOrPhone, password) {
  const isEmail = emailOrPhone.includes('@')
  const payload = isEmail
    ? { email: emailOrPhone.trim().toLowerCase(), password }
    : { phone: emailOrPhone.trim(), password }

  const res = await apiClient.post('/auth/login', payload)
  const authData = res.data || res

  if (authData.accessToken) {
    localStorage.setItem('token', authData.accessToken)
    localStorage.setItem('trustnear_admin_token', authData.accessToken)
  }
  if (authData.refreshToken) {
    localStorage.setItem('refreshToken', authData.refreshToken)
  }
  if (authData.user) {
    localStorage.setItem('user', JSON.stringify(authData.user))
  }

  return authData
}

export async function getMe() {
  try {
    const res = await apiClient.get('/auth/me')
    return res.data || res
  } catch (err) {
    console.warn('[Admin Auth] getMe failed:', err.message)
    return null
  }
}

export function logout() {
  localStorage.removeItem('token')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('user')
  localStorage.removeItem('trustnear_admin_token')
}
