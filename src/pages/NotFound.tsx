import { Link } from 'react-router-dom';

export const NotFound = () => {
  return (
    <div className="text-center py-16">
      <h1 className="text-6xl font-bold mb-4">404</h1>
      <h2 className="text-2xl font-semibold mb-4">Página não encontrada</h2>
      <p className="text-text-light dark:text-text-dark mb-8">
        A página que você está procurando não existe ou foi movida.
      </p>
      <Link
        to="/"
        className="bg-primary hover:bg-primary-light text-white px-6 py-3 rounded-lg font-semibold transition-colors"
      >
        Voltar para Home
      </Link>
    </div>
  );
};