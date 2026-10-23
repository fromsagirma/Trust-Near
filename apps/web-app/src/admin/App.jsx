import { Routes, Route } from 'react-router-dom'
import { AdminProfileProvider } from './context/AdminProfileContext.jsx'
import RequireAdminAuth from './components/auth/RequireAdminAuth.jsx'
import OverviewPage from './pages/OverviewPage.jsx'
import BusinessesPage from './pages/BusinessesPage.jsx'
import ApprovalsPage from './pages/ApprovalsPage.jsx'
import ModerationPage from './pages/ModerationPage.jsx'
import ClaimsPage from './pages/ClaimsPage.jsx'
import AnalyticsPage from './pages/AnalyticsPage.jsx'
import UsersPage from './pages/UsersPage.jsx'
import CategoriesPage from './pages/CategoriesPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import './styles/index.css'

export default function AdminApp() {
  return (
    <AdminProfileProvider>
      <Routes>
        <Route element={<RequireAdminAuth />}>
          <Route index element={<OverviewPage />} />
          <Route path="businesses" element={<BusinessesPage />} />
          <Route path="approvals" element={<ApprovalsPage />} />
          <Route path="moderation" element={<ModerationPage />} />
          <Route path="claims" element={<ClaimsPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Routes>
    </AdminProfileProvider>
  )
}
