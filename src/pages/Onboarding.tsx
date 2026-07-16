// src/pages/Onboarding.tsx
import { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';

export const Onboarding = () => {
  const { user, isLoaded } = useUser();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'restaurante',
    address: { street: '', city: '', state: '', zip: '' },
    tags: [] as string[],
    photos: [] as File[],
  });

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-creme-andino">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-aji-rojo border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center bg-creme-andino">Acesso negado</div>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submitting business:', formData);
    navigate('/');
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFormData(prev => ({ ...prev, photos: Array.from(e.target.files!) }));
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-noche-lima rounded-2xl shadow-lg p-8 border border-oro-inca/20">
        <h2 className="font-playfair text-2xl font-bold text-aji-rojo mb-6">Informações Básicas</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome do Negócio</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-3 rounded-lg border border-oro-inca/30 bg-white dark:bg-noche-lima text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-aji-rojo"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full p-3 rounded-lg border border-oro-inca/30 bg-white dark:bg-noche-lima text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-aji-rojo"
              rows={4}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoria</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full p-3 rounded-lg border border-oro-inca/30 bg-white dark:bg-noche-lima text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-aji-rojo"
              required
            >
              <option value="restaurante">Restaurante</option>
              <option value="mercado">Mercado</option>
              <option value="cafe">Café</option>
              <option value="servicos">Serviços</option>
            </select>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setStep(2)}
          className="w-full bg-aji-rojo text-white py-3 rounded-xl font-semibold hover:bg-aji-rojo/90 transition-colors"
        >
          Próximo
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-noche-lima rounded-2xl shadow-lg p-8 border border-oro-inca/20">
        <h2 className="font-playfair text-2xl font-bold text-aji-rojo mb-6">Endereço e Contato</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rua e Número</label>
            <input
              type="text"
              value={formData.address.street}
              onChange={(e) => setFormData({ ...formData, address: { ...formData.address, street: e.target.value } })}
              className="w-full p-3 rounded-lg border border-oro-inca/30 bg-white dark:bg-noche-lima text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-aji-rojo"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cidade</label>
              <input
                type="text"
                value={formData.address.city}
                onChange={(e) => setFormData({ ...formData, address: { ...formData.address, city: e.target.value } })}
                className="w-full p-3 rounded-lg border border-oro-inca/30 bg-white dark:bg-noche-lima text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-aji-rojo"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estado</label>
              <select
                value={formData.address.state}
                onChange={(e) => setFormData({ ...formData, address: { ...formData.address, state: e.target.value } })}
                className="w-full p-3 rounded-lg border border-oro-inca/30 bg-white dark:bg-noche-lima text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-aji-rojo"
                required
              >
                <option value="">Selecione o estado</option>
                <option value="SP">São Paulo</option>
                <option value="RJ">Rio de Janeiro</option>
                <option value="DF">Distrito Federal</option>
                <option value="PR">Paraná</option>
                <option value="MG">Minas Gerais</option>
                <option value="RS">Rio Grande do Sul</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CEP</label>
              <input
                type="text"
                value={formData.address.zip}
                onChange={(e) => setFormData({ ...formData, address: { ...formData.address, zip: e.target.value } })}
                className="w-full p-3 rounded-lg border border-oro-inca/30 bg-white dark:bg-noche-lima text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-aji-rojo"
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-4 mt-6">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="px-6 py-2 rounded-xl border border-oro-inca/30 text-gray-700 dark:text-gray-300 hover:bg-oro-inca/10 transition-colors"
          >
            Voltar
          </button>
          <button
            type="button"
            onClick={() => setStep(3)}
            className="bg-aji-rojo text-white px-6 py-2 rounded-xl font-semibold hover:bg-aji-rojo/90 transition-colors"
          >
            Próximo
          </button>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-noche-lima rounded-2xl shadow-lg p-8 border border-oro-inca/20">
        <h2 className="font-playfair text-2xl font-bold text-aji-rojo mb-6">Tags e Fotos</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags (ex: #ceviche, #lomo-saltado)</label>
            <input
              type="text"
              placeholder="Adicione uma tag e pressione Enter"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value) {
                  e.preventDefault();
                  setFormData({
                    ...formData,
                    tags: [...formData.tags, e.currentTarget.value],
                  });
                  e.currentTarget.value = '';
                }
              }}
              className="w-full p-3 rounded-lg border border-oro-inca/30 bg-white dark:bg-noche-lima text-gray-700 dark:text-gray-300"
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.tags.map((tag, i) => (
                <span key={i} className="bg-oro-inca/20 text-oro-inca px-2 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                  {tag}
                  <button onClick={() => setFormData({ ...formData, tags: formData.tags.filter((_, j) => j !== i) })} className="hover:text-aji-rojo">×</button>
                </span>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fotos do Negócio</label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handlePhotoChange}
              className="w-full p-3 rounded-lg border border-oro-inca/30 bg-white dark:bg-noche-lima text-gray-700 dark:text-gray-300"
            />
            <div className="flex gap-2 mt-2 flex-wrap">
              {formData.photos.map((file, i) => (
                <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden">
                  <img src={URL.createObjectURL(file)} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                  <button onClick={() => setFormData({ ...formData, photos: formData.photos.filter((_, j) => j !== i) })} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600">×</button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-4 mt-6">
          <button
            type="button"
            onClick={() => setStep(2)}
            className="px-6 py-2 rounded-xl border border-oro-inca/30 text-gray-700 dark:text-gray-300 hover:bg-oro-inca/10 transition-colors"
          >
            Voltar
          </button>
          <button
            type="submit"
            className="bg-aji-rojo text-white px-6 py-2 rounded-xl font-semibold hover:bg-aji-rojo/90 transition-colors"
          >
            Finalizar Cadastro
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="font-playfair text-3xl md:text-4xl font-bold text-aji-rojo mb-8 text-center">
        Cadastre seu Negócio
      </h1>
      <p className="text-center text-gray-600 dark:text-gray-400 mb-12 max-w-2xl mx-auto">
        Preencha as informações abaixo para cadastrar seu negócio gratuitamente no SaborPeruano
      </p>

      <form onSubmit={handleSubmit} className="space-y-8">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </form>
    </div>
  );
};
