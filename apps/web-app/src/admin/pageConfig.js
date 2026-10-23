// Drives both the sidebar nav and each page's header/panel content.
// One entry per admin section. Icon names map to lucide-react imports
// in Sidebar.jsx / Header.jsx.

export const pages = [
  {
    id: 'overview',
    path: '/admin',
    navLabel: 'Overview',
    icon: 'LayoutGrid',
    headerTitle: 'Overview',
    headerSubtitle: 'Snapshot of what needs admin attention across the platform.',
    panelTitle: 'Overview Panel',
    panelDescription:
      'Pending approvals, flagged content, and open claims will surface here at a glance once the API is connected.',
  },
  {
    id: 'businesses',
    path: '/admin/businesses',
    navLabel: 'Businesses',
    icon: 'Building2',
    headerTitle: 'Businesses Directory Registry',
    headerSubtitle: 'Complete database catalog of all published, pending, and claimed businesses.',
    panelTitle: 'Businesses Panel',
    panelDescription:
      'Search, filter, and inspect all businesses across TrustNear with ratings, owners, and category metadata.',
  },
  {
    id: 'approvals',
    path: '/admin/approvals',
    navLabel: 'Approvals',
    icon: 'Store',
    headerTitle: 'Business Listing Approvals',
    headerSubtitle: 'Review new listings before they go live.',
    panelTitle: 'Approvals Panel',
    panelDescription:
      'Approve or reject business listings submitted by users and business owners. Listings created via the seed admin role skip this queue and publish immediately.',
  },
  {
    id: 'moderation',
    path: '/admin/moderation',
    navLabel: 'Moderation',
    icon: 'Flag',
    headerTitle: 'Content Moderation',
    headerSubtitle: 'Review flagged reviews, images, and listings.',
    panelTitle: 'Moderation Panel',
    panelDescription:
      'Reviews, images, and listings reported by users or caught by automated heuristics land here. Removed content is soft-deleted, not permanently purged.',
  },
  {
    id: 'claims',
    path: '/admin/claims',
    navLabel: 'Claims',
    icon: 'ShieldCheck',
    headerTitle: 'Business Claim Requests',
    headerSubtitle: 'Verify ownership before transferring a listing.',
    panelTitle: 'Claims Panel',
    panelDescription:
      'Review ownership claims submitted by business owners for existing listings, along with their verification info, and approve or reject each request.',
  },
  {
    id: 'analytics',
    path: '/admin/analytics',
    navLabel: 'Analytics',
    icon: 'BarChart3',
    headerTitle: 'Platform Analytics',
    headerSubtitle: 'Track growth and content quality over time.',
    panelTitle: 'Analytics Panel',
    panelDescription:
      'Summary counts of total users, businesses, and reviews, plus top-rated and most-viewed listings, filterable by category and city.',
  },
  {
    id: 'users',
    path: '/admin/users',
    navLabel: 'Users',
    icon: 'Users',
    headerTitle: 'User Governance & Account Safety',
    headerSubtitle: 'Manage user credentials, ban abusive accounts, and audit access permissions.',
    panelTitle: 'User Governance Panel',
    panelDescription:
      'Manage registered consumer accounts, business owner roles, and seed admin access levels with audit tracking.',
  },
  {
    id: 'categories',
    path: '/admin/categories',
    navLabel: 'Categories',
    icon: 'Layers',
    headerTitle: 'Category Management',
    headerSubtitle: 'Keep the category list clean and consistent.',
    panelTitle: 'Categories Panel',
    panelDescription:
      'Manage the business categories available across search filters, listing creation, and admin queues.',
  },
]
