import Sidebar from './Sidebar.jsx'
import Header from './Header.jsx'
import { useAdminProfile } from '../../context/AdminProfileContext.jsx'

export default function Layout({ title, subtitle, children }) {
  const { profile } = useAdminProfile()
  const isDark = profile.theme === 'dark'

  return (
    <div className={`app ${isDark ? 'dark' : ''}`}>
      <Sidebar />
      <div className="main">
        <Header title={title} subtitle={subtitle} />
        <main className="main-content">{children}</main>
      </div>
    </div>
  )
}
