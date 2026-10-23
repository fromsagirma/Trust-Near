import Layout from '../components/layout/Layout.jsx'
import PagePanel from '../components/common/PagePanel.jsx'

export default function GenericPage({ config }) {
  return (
    <Layout title={config.headerTitle} subtitle={config.headerSubtitle}>
      <PagePanel
        icon={config.icon}
        title={config.panelTitle}
        description={config.panelDescription}
      />
    </Layout>
  )
}
