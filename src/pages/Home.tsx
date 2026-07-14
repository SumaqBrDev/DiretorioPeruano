import { Link } from 'react-router-dom';

export const Home = () => {
  return (
    <div className="text-center py-16">
      <h1 className="text-4xl md:text-5xl font-bold mb-6">
        Encontre os melhores negócios no Peru
      </h1>
      <p className="text-lg md:text-xl max-w-3xl mx-auto mb-8">
        DiretorioPeruano é a plataforma líder para conectar empresas e consumidores no Peru.
      </p>
      <Link
        to="/busca"
        className="bg-primary hover:bg-primary-light text-white px-8 py-3 rounded-lg font-semibold text-lg transition-colors"
      >
        Começar Busca
      </Link>
      
      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg shadow-sm">
          <h2 className="text-2xl font-semibold mb-3">🔍 Busca Avançada</h2>
          <p className="text-text-light dark:text-text-dark">
            Encontre exatamente o que você precisa com nossa busca inteligente.
          </p>
        </div>
        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg shadow-sm">
          <h2 className="text-2xl font-semibold mb-3">📊 Dados Atualizados</h2>
          <p className="text-text-light dark:text-text-dark">
            Informações em tempo real sobre empresas e serviços no Peru.
          </p>
        </div>
        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg shadow-sm">
          <h2 className="text-2xl font-semibold mb-3">📱 Fácil de Usar</h2>
          <p className="text-text-light dark:text-text-dark">
            Acesse de qualquer dispositivo, em qualquer lugar.
          </p>
        </div>
      </div>
    </div>
  );
};