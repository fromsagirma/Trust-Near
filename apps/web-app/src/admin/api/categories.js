import apiClient from './client'

// TN-007 — Category Taxonomy Management
// GET /api/categories (Public endpoint on live backend)
export async function getCategories() {
  try {
    const res = await apiClient.get('/categories')
    const list = res.data?.categories || res.data || res || []
    if (Array.isArray(list) && list.length > 0) {
      return list.map((cat, idx) => ({
        id: cat.id ?? idx + 1,
        rawId: cat.id ?? idx + 1,
        name: cat.name ? cat.name.charAt(0).toUpperCase() + cat.name.slice(1) : 'Category',
        slug: cat.name ? cat.name.toLowerCase() : `cat-${cat.id || idx + 1}`,
        description: cat.description || `Classifications for ${cat.name || 'local services'}`,
        count: cat._count?.businesses || cat.count || 0,
        isActive: cat.isActive !== undefined ? cat.isActive : true,
      }))
    }
    return []
  } catch (err) {
    console.error('Failed to fetch live categories from backend:', err.message)
    return []
  }
}

export async function createCategory(payload) {
  try {
    const res = await apiClient.post('/categories', { name: payload.name })
    const cat = res.data || res
    return {
      id: cat.id || `cat-${Date.now()}`,
      name: cat.name ? cat.name.charAt(0).toUpperCase() + cat.name.slice(1) : payload.name,
      slug: (cat.name || payload.name).toLowerCase(),
      description: payload.description || 'General category in directory',
      count: 0,
      isActive: true,
    }
  } catch (err) {
    console.warn('Backend category creation failed:', err.message)
    throw err
  }
}

export async function updateCategory(categoryId, payload) {
  try {
    const numericId = String(categoryId).replace(/^cat-/, '')
    const res = await apiClient.put(`/categories/${numericId}`, payload).catch(() => null)
    return res?.data || { id: categoryId, ...payload }
  } catch (err) {
    return { id: categoryId, ...payload }
  }
}

export async function deleteCategory(categoryId) {
  try {
    const numericId = String(categoryId).replace(/^cat-/, '')
    const res = await apiClient.delete(`/categories/${numericId}`)
    return res.data || res
  } catch (err) {
    console.error('Delete category failed:', err.message)
    throw err
  }
}
