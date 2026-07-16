import { Link } from 'react-router-dom'

interface BreadcrumbProps {
  name: string;
}

export const Breadcrumb = ({ name }: { name: string }) => {
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