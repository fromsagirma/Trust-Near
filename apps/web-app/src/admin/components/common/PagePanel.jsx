import * as Icons from 'lucide-react'

export default function PagePanel({ icon, title, description }) {
  const Icon = Icons[icon] || Icons.Shield

  return (
    <div className="panel">
      <div className="panel-icon">
        <Icon size={20} />
      </div>
      <p className="panel-title">{title}</p>
      <p className="panel-desc">{description}</p>
    </div>
  )
}
