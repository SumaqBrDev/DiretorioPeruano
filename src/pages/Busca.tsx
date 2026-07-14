import { useState } from 'react';
import { SearchIcon } from '@heroicons/react/solid';
import { useEmpresaStore } from '../store/useEmpresaStore';

export const Busca = () => {
  const [query, setQuery] = useState('');
  const { empresas, fetchEmpresas } = useEmpresaStore();

  const handleSearch = () => {
    fetchEmpresas({ query });
  };

  return (
    <div className="py-8">
      <h1 className="text-3xl font-bold mb-8">Busca de Empresas</h1>
      
      <div className="flex gap-4 mb-8">
        <div className="flex-grow relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar empresas..."
            className="w-full p-3 pl-12 rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-text-light dark:text-text-dark"
          />
          <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        </div>
        <button
          onClick={handleSearch}
          className="bg-primary hover:bg-primary-light text-white px-6 py-3 rounded-lg font-semibold transition-colors"
        >
          Buscar
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {empresas.map((empresa) => (
          <div key={empresa.id} className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-2">{empresa.name}</h2>
            <p className="text-text-light dark:text-text-dark mb-2">
              <strong>Categoria:</strong> {empresa.category}
            </p>
            <p className="text-text-light dark:text-text-dark mb-2">
              <strong>Localização:</strong> {empresa.location}
            </p>
            <p className="text-text-light dark:text-text-dark mb-4">
              <strong>Avaliação:</strong> {empresa.rating} ⭐
            </p>
            <button className="bg-primary hover:bg-primary-light text-white px-4 py-2 rounded-lg transition-colors">
              Ver Perfil
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};