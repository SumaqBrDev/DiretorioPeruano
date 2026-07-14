import { Link } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';

export const Navbar = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="bg-primary text-white py-4 shadow-md">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold">
          DiretorioPeruano
        </Link>
        <nav className="flex items-center gap-6">
          <Link to="/busca" className="hover:text-primary-light transition-colors">
            Busca
          </Link>
          <Link to="/dashboard" className="hover:text-primary-light transition-colors">
            Dashboard
          </Link>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </nav>
      </div>
    </header>
  );
};