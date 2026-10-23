import { useState, useEffect } from 'react'
import {
  Layers,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Store,
  Search,
} from 'lucide-react'
import Layout from '../components/layout/Layout.jsx'
import { getCategories, createCategory, updateCategory, deleteCategory } from '../api/categories'

export default function CategoriesPage() {
  const [categories, setCategories] = useState([])
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatDesc, setNewCatDesc] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCategories() {
      try {
        const data = await getCategories()
        if (Array.isArray(data)) {
          setCategories(data)
        }
      } catch (err) {
        console.warn('Backend categories endpoint offline, initialized with empty state:', err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchCategories()
  }, [])

  const handleToggleStatus = async (id) => {
    const cat = categories.find((c) => c.id === id)
    if (!cat) return
    const updatedStatus = !cat.isActive

    try {
      await updateCategory(id, { isActive: updatedStatus })
    } catch (err) {
      console.warn('Backend endpoint offline, updating UI state:', err.message)
    }

    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isActive: updatedStatus } : c))
    )
  }

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category? Listings under this category may become uncategorized.')) {
      return
    }

    try {
      await deleteCategory(id)
    } catch (err) {
      console.warn('Backend endpoint offline, updating UI state:', err.message)
    }

    setCategories((prev) => prev.filter((c) => c.id !== id))
  }

  const handleCreateCategory = async (e) => {
    e.preventDefault()
    if (!newCatName.trim()) return

    const newCat = {
      id: `cat-${Date.now()}`,
      name: newCatName.trim(),
      slug: newCatName.trim().toLowerCase().replace(/\s+/g, '-'),
      description: newCatDesc.trim() || 'General classification for platform directory listings',
      count: 0,
      isActive: true,
    }

    try {
      await createCategory(newCat)
    } catch (err) {
      console.warn('Backend endpoint offline, adding to UI state:', err.message)
    }

    setCategories((prev) => [...prev, newCat])
    setNewCatName('')
    setNewCatDesc('')
    setIsAddModalOpen(false)
  }

  const filteredCategories = categories.filter((c) =>
    (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.slug || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <Layout
      title="Category Management"
      subtitle="Organize business taxonomy across search filters, listing creation, and verification queues."
    >
      {/* Header Actions & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search category name or slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-emerald-500/50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md shadow-sm transition-colors shrink-0 w-auto self-start sm:self-auto cursor-pointer"
        >
          <Plus size={15} />
          <span>Add Category</span>
        </button>
      </div>

      {/* Category Cards Grid */}
      <div className="grid-3">
        {filteredCategories.length === 0 ? (
          <div className="empty-box col-span-full">
            <Layers size={28} className="mx-auto text-slate-400 opacity-60" />
            <p className="font-semibold text-slate-600 dark:text-slate-300">No categories registered yet.</p>
            <p className="text-slate-400">Add a new category to populate the directory taxonomy.</p>
          </div>
        ) : (
          filteredCategories.map((cat) => (
            <div key={cat.id} className="cat-card">
              <div className="cat-header">
                <div className="flex items-center gap-3">
                  <div className="cat-icon-box">
                    <Store size={18} />
                  </div>
                  <div>
                    <h3 className="cat-title">{cat.name}</h3>
                    <p className="cat-slug">/{cat.slug}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggleStatus(cat.id)}
                  title={cat.isActive ? 'Active (Click to disable)' : 'Disabled (Click to enable)'}
                  className={cat.isActive ? 'text-emerald-600 hover:text-emerald-700' : 'text-slate-400 hover:text-slate-600'}
                >
                  {cat.isActive ? <ToggleRight size={26} /> : <ToggleLeft size={26} />}
                </button>
              </div>

              <p className="cat-desc">
                {cat.description || 'No description provided.'}
              </p>

              <div className="cat-footer">
                <span className="font-medium text-slate-500 dark:text-slate-400">
                  {cat.count || 0} active listings
                </span>
                <button
                  onClick={() => handleDeleteCategory(cat.id)}
                  title="Delete category taxonomy item"
                  className="btn-icon-delete"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Category Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3 className="modal-title">Create New Category</h3>
            <p className="modal-body text-slate-500 dark:text-slate-400">
              Add a new top-level classification for businesses. This will appear immediately in filter dropdowns and listing forms.
            </p>

            <form onSubmit={handleCreateCategory} className="space-y-4 pt-1">
              <div className="form-group">
                <label className="form-label">Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pharmacy & Healthcare"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="input w-full"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  placeholder="Brief description of the business types included in this category..."
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  rows={3}
                  className="textarea"
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Create Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}
