import { Link } from 'react-router-dom'

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  name?: string;
  items?: BreadcrumbItem[];
}

export const Breadcrumb = ({ name, items }: BreadcrumbProps) => {
  // If items are provided, render those (used by policy pages).
  if (items && items.length > 0) {
    return (
      <nav className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-6" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-aji-rojo transition-colors">
          <span className="flex items-center gap-1">
            <span>🏠</span> Inicio
          </span>
        </Link>
        {items.map((item, i) => (
          <span key={i} className="flex items-center gap-2">
            <span className="text-gray-400 dark:text-gray-500">/</span>
            {item.href ? (
              <Link to={item.href} className="hover:text-aji-rojo transition-colors">
                {item.label}
              </Link>
            ) : (
              <span className="text-aji-rojo font-medium">{item.label}</span>
            )}
          </span>
        ))}
      </nav>
    )
  }

  return (
    <nav className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-6" aria-label="Breadcrumb">
      <Link to="/" className="hover:text-aji-rojo transition-colors">
        <span className="flex items-center gap-1">
          <span>🏠</span> Inicio
        </span>
      </Link>
      <span className="text-gray-400 dark:text-gray-500">/</span>
      <Link to="/busca" className="hover:text-aji-rojo transition-colors">Buscar</Link>
      <span className="text-gray-400 dark:text-gray-500">/</span>
      <span className="text-aji-rojo font-medium">{name}</span>
    </nav>
  )
}
