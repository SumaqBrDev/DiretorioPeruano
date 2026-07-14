import { useParams } from 'react-router-dom';
import { useEmpresaStore } from '../store/useEmpresaStore';
import { MapPinIcon, ClockIcon, PhoneIcon, EnvelopeIcon, StarIcon, GlobeAltIcon } from '@heroicons/react/24/solid';

export const Empresa = () => {
  const { id } = useParams<{ id: string }>();
  const { empresas } = useEmpresaStore();
  const empresa = empresas.find((e) => e.id === id);

  if (!empresa) {
    return <div className="text-center py-16">Empresa não encontrada.</div>;
  }

  return (
    <div className="py-8 max-w-4xl mx-auto">
      <div className="bg-surface-light dark:bg-surface-dark p-8 rounded-lg shadow-sm mb-8">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex-shrink-0">
            <img
              src={empresa.imageUrl || `https://via.placeholder.com/150`}
              alt={empresa.name}
              className="w-32 h-32 rounded-full object-cover"
            />
          </div>
          <div className="flex-grow">
            <h1 className="text-3xl font-bold mb-2">{empresa.name}</h1>
            <p className="text-xl text-text-light dark:text-text-dark mb-4">
              {empresa.category}
            </p>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-1">
                <StarIcon className="h-5 w-5 text-yellow-500" />
                <span>{empresa.rating} ⭐</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPinIcon className="h-5 w-5 text-primary" />
                <span>{empresa.location}</span>
              </div>
            </div>
            <p className="text-text-light dark:text-text-dark mb-6">
              {empresa.description}
            </p>
            <div className="flex flex-wrap gap-4">
              <a
                href={`tel:${empresa.phone}`}
                className="flex items-center gap-2 bg-primary hover:bg-primary-light text-white px-4 py-2 rounded-lg transition-colors"
              >
                <PhoneIcon className="h-5 w-5" /> Ligar
              </a>
              <a
                href={`mailto:${empresa.email}`}
                className="flex items-center gap-2 bg-primary hover:bg-primary-light text-white px-4 py-2 rounded-lg transition-colors"
              >
                <EnvelopeIcon className="h-5 w-5" /> Email
              </a>
              {empresa.website && (
                <a
                  href={empresa.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-primary hover:bg-primary-light text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <GlobeAltIcon className="h-5 w-5" /> Site
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Horário */}
        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <ClockIcon className="h-5 w-5 text-primary" /> Horário de Atendimento
          </h2>
          <ul className="space-y-2">
            {empresa.hours ? (
              Object.entries(empresa.hours).map(([day, hours]) => (
                <li key={day} className="flex justify-between">
                  <span className="capitalize">{day}:</span>
                  <span>{hours}</span>
                </li>
              ))
            ) : (
              <li>Horário não informado.</li>
            )}
          </ul>
        </div>

        {/* Localização */}
        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg shadow-sm lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <MapPinIcon className="h-5 w-5 text-primary" /> Localização
          </h2>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
            <p className="text-gray-500 dark:text-gray-400">
              Mapa: {empresa.address} (Google Maps)
            </p>
          </div>
        </div>
      </div>

      {/* Avaliações */}
      <div className="mt-8 bg-surface-light dark:bg-surface-dark p-6 rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Avaliações</h2>
        {empresa.rating >= 4.5 && (
          <div className="mb-4 p-4 bg-green-100 dark:bg-green-900 rounded-lg">
            <p className="font-semibold">⭐ Excelente!</p>
            <p>Esta empresa é altamente recomendada pelos usuários.</p>
          </div>
        )}
        {empresa.rating < 4.5 && empresa.rating >= 3 && (
          <div className="mb-4 p-4 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
            <p className="font-semibold">⭐ Boa</p>
            <p>Esta empresa tem boas avaliações, mas pode melhorar.</p>
          </div>
        )}
        {empresa.rating < 3 && (
          <div className="mb-4 p-4 bg-red-100 dark:bg-red-900 rounded-lg">
            <p className="font-semibold">⚠️ Atenção</p>
            <p>Esta empresa tem avaliações abaixo da média.</p>
          </div>
        )}
        <div className="space-y-4">
          {Array(3).fill(0).map((_, i) => {
            const userRating = Math.floor(Math.random() * 5) + 1;
            return (
              <div key={i} className="border-b border-border-light dark:border-border-dark pb-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                    {`U${i + 1}`}
                  </div>
                  <div>
                    <p className="font-semibold">Usuário {i + 1}</p>
                    <div className="flex items-center gap-1">
                      {Array(5).fill(0).map((_, j) => (
                        <StarIcon
                          key={j}
                          className={`h-4 w-4 ${j < userRating ? 'text-yellow-500' : 'text-gray-300'}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-text-light dark:text-text-dark">
                  Ótimo serviço! Recomendo.
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};