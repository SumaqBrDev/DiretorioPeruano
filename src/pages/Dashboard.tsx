import { useState } from 'react';
import { useEmpresaStore } from '../store/useEmpresaStore';
import { PencilIcon, ChartBarIcon, ClockIcon, StarIcon } from '@heroicons/react/24/solid';

export const Dashboard = () => {
  const { empresas } = useEmpresaStore();
  const [selectedEmpresa, setSelectedEmpresa] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    location: '',
    address: '',
    phone: '',
    email: '',
    website: '',
  });

  const empresa = empresas.find((e) => e.id === selectedEmpresa);

  const handleEdit = (empresaId: string) => {
    const empresaToEdit = empresas.find((e) => e.id === empresaId);
    if (empresaToEdit) {
      setSelectedEmpresa(empresaId);
      setFormData({
        name: empresaToEdit.name,
        description: empresaToEdit.description,
        category: empresaToEdit.category,
        location: empresaToEdit.location,
        address: empresaToEdit.address,
        phone: empresaToEdit.phone,
        email: empresaToEdit.email,
        website: empresaToEdit.website,
      });
      setEditMode(true);
    }
  };

  const handleSave = () => {
    // Lógica para salvar as alterações (integrar com API)
    console.log('Salvar:', formData);
    setEditMode(false);
  };

  const renderStars = (rating: number) => {
    return Array(5).fill(0).map((_, j) => (
      <StarIcon
        key={j}
        className={`h-4 w-4 ${j < rating ? 'text-yellow-500' : 'text-gray-300'}`}
      />
    ));
  };

  return (
    <div className="py-8">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      
      {!selectedEmpresa ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {empresas.map((empresa) => (
            <div key={empresa.id} className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-semibold mb-2">{empresa.name}</h2>
              <p className="text-text-light dark:text-text-dark mb-4">
                {empresa.category} - {empresa.location}
              </p>
              <button
                onClick={() => handleEdit(empresa.id)}
                className="flex items-center gap-2 bg-primary hover:bg-primary-light text-white px-4 py-2 rounded-lg transition-colors"
              >
                <PencilIcon className="h-5 w-5" /> Editar
              </button>
            </div>
          ))}
        </div>
      ) : editMode ? (
        <div className="bg-surface-light dark:bg-surface-dark p-8 rounded-lg shadow-sm max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Editar Empresa</h2>
          <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nome</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2 rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-text-light dark:text-text-dark"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Descrição</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2 rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-text-light dark:text-text-dark"
                  rows={4}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Categoria</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full p-2 rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-text-light dark:text-text-dark"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Localização</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full p-2 rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-text-light dark:text-text-dark"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Endereço</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full p-2 rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-text-light dark:text-text-dark"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Telefone</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full p-2 rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-text-light dark:text-text-dark"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full p-2 rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-text-light dark:text-text-dark"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Website</label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="w-full p-2 rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-text-light dark:text-text-dark"
                />
              </div>
            </div>
            <div className="flex justify-end gap-4 mt-6">
              <button
                type="button"
                onClick={() => setEditMode(false)}
                className="px-4 py-2 rounded-lg border border-border-light dark:border-border-dark text-text-light dark:text-text-dark"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-primary hover:bg-primary-light text-white px-4 py-2 rounded-lg transition-colors"
              >
                Salvar
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-surface-light dark:bg-surface-dark p-8 rounded-lg shadow-sm max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">{empresa?.name}</h2>
            <button
              onClick={() => handleEdit(empresa?.id || '')}
              className="flex items-center gap-2 bg-primary hover:bg-primary-light text-white px-4 py-2 rounded-lg transition-colors"
            >
              <PencilIcon className="h-5 w-5" /> Editar
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-lg border border-border-light dark:border-border-dark">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <ChartBarIcon className="h-5 w-5 text-primary" /> Métricas
              </h3>
              <p className="text-text-light dark:text-text-dark">
                <strong>Visitas:</strong> {Math.floor(Math.random() * 1000)} (últimos 30 dias)
              </p>
              <p className="text-text-light dark:text-text-dark">
                <strong>Avaliação:</strong> {empresa?.rating} ⭐
              </p>
            </div>
            <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-lg border border-border-light dark:border-border-dark">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <ClockIcon className="h-5 w-5 text-primary" /> Horário de Atendimento
              </h3>
              <ul className="space-y-1 text-text-light dark:text-text-dark">
                {empresa?.hours ? (
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
          </div>
          
          <div className="mt-6 bg-surface-light dark:bg-surface-dark p-4 rounded-lg border border-border-light dark:border-border-dark">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <StarIcon className="h-5 w-5 text-primary" /> Avaliações Recentes
            </h3>
            <div className="space-y-3">
              {Array(3).fill(0).map((_, i) => {
                const userRating = Math.floor(Math.random() * 5) + 1;
                return (
                  <div key={i} className="border-b border-border-light dark:border-border-dark pb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {`U${i + 1}`}
                      </div>
                      <div className="flex items-center gap-1">
                        {renderStars(userRating)}
                      </div>
                    </div>
                    <p className="text-text-light dark:text-text-dark text-sm">
                      Ótimo serviço! Recomendo.
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};