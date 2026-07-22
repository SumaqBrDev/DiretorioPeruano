// src/pages/Onboarding.tsx
import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';
import { saveBusiness } from '../lib/localData';

// --- Constantes ---

const BRAZIL_STATES = [
  { sigla: 'AC', nome: 'Acre' },
  { sigla: 'AL', nome: 'Alagoas' },
  { sigla: 'AP', nome: 'Amapá' },
  { sigla: 'AM', nome: 'Amazonas' },
  { sigla: 'BA', nome: 'Bahia' },
  { sigla: 'CE', nome: 'Ceará' },
  { sigla: 'DF', nome: 'Distrito Federal' },
  { sigla: 'ES', nome: 'Espírito Santo' },
  { sigla: 'GO', nome: 'Goiás' },
  { sigla: 'MA', nome: 'Maranhão' },
  { sigla: 'MT', nome: 'Mato Grosso' },
  { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { sigla: 'MG', nome: 'Minas Gerais' },
  { sigla: 'PA', nome: 'Pará' },
  { sigla: 'PB', nome: 'Paraíba' },
  { sigla: 'PR', nome: 'Paraná' },
  { sigla: 'PE', nome: 'Pernambuco' },
  { sigla: 'PI', nome: 'Piauí' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' },
  { sigla: 'RN', nome: 'Rio Grande do Norte' },
  { sigla: 'RS', nome: 'Rio Grande do Sul' },
  { sigla: 'RO', nome: 'Rondônia' },
  { sigla: 'RR', nome: 'Roraima' },
  { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'SP', nome: 'São Paulo' },
  { sigla: 'SE', nome: 'Sergipe' },
  { sigla: 'TO', nome: 'Tocantins' },
];

const CATEGORIES = [
  { value: 'restaurante', label: 'Restaurante' },
  { value: 'mercado', label: 'Mercado' },
  { value: 'cafe', label: 'Café' },
  { value: 'servicos', label: 'Serviços' },
  { value: 'salud', label: 'Saúde' },
  { value: 'juridico', label: 'Jurídico' },
  { value: 'financiero', label: 'Financeiro' },
  { value: 'imuebles', label: 'Imóveis' },
];

// --- Helpers ---

function formatCEP(value: string): string {
  // Remove tudo que não é dígito
  const digits = value.replace(/\D/g, '');
  // Limita a 8 dígitos
  const trimmed = digits.slice(0, 8);
  // Aplica máscara XXXXX-XXX
  if (trimmed.length <= 5) return trimmed;
  return `${trimmed.slice(0, 5)}-${trimmed.slice(5)}`;
}

function isValidCEP(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  return digits.length === 8;
}

function isValidCity(value: string): boolean {
  return value.trim().length >= 3;
}

// --- Toast Component ---

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  visible: boolean;
  onClose: () => void;
}

function Toast({ message, type, visible, onClose }: ToastProps) {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [visible, onClose]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, x: 50, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 50, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl border ${
            type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/80 dark:border-green-700 dark:text-green-200'
              : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/80 dark:border-red-700 dark:text-red-200'
          }`}
        >
          <span className="text-xl">
            {type === 'success' ? '✅' : '❌'}
          </span>
          <span className="font-medium text-sm">{message}</span>
          <button
            onClick={onClose}
            className="ml-2 opacity-60 hover:opacity-100 transition-opacity"
          >
            ✕
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// --- Error Message Component ---

function FieldError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <motion.p
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-red-500 text-xs mt-1 flex items-center gap-1"
    >
      <span>⚠</span> {message}
    </motion.p>
  );
}

// --- FormData Type ---

interface OnboardingFormData {
  name: string;
  description: string;
  category: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  tags: string[];
  photos: File[];
}

// --- Component ---

export const Onboarding = () => {
  const { user, isLoaded } = useUser();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<OnboardingFormData>({
    name: '',
    description: '',
    category: 'restaurante',
    address: { street: '', city: '', state: '', zip: '' },
    tags: [],
    photos: [],
  });
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // --- Validation ---

  const validateStep1 = (): boolean => {
    const newErrors: Record<string, string | null> = {};
    if (!formData.name.trim()) newErrors.name = 'O nome do negócio é obrigatório';
    if (!formData.description.trim()) newErrors.description = 'A descrição é obrigatória';
    if (formData.description.trim().length < 10) {
      newErrors.description = 'A descrição deve ter pelo menos 10 caracteres';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const newErrors: Record<string, string | null> = {};

    if (!formData.address.street.trim()) {
      newErrors.street = 'O endereço é obrigatório';
    }

    if (!isValidCity(formData.address.city)) {
      newErrors.city = 'A cidade deve ter pelo menos 3 caracteres';
    }

    if (!formData.address.state) {
      newErrors.state = 'Selecione um estado';
    }

    if (formData.address.zip && !isValidCEP(formData.address.zip)) {
      newErrors.zip = 'CEP inválido. Use o formato XXXXX-XXX';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // --- Handlers ---

  const handleZipChange = useCallback((value: string) => {
    const formatted = formatCEP(value);
    setFormData(prev => ({
      ...prev,
      address: { ...prev.address, zip: formatted },
    }));
    // Clear zip error on change
    if (errors.zip) {
      setErrors(prev => ({ ...prev, zip: null }));
    }
  }, [errors.zip]);

  const clearError = useCallback((field: string) => {
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  }, [errors]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all steps before final submit
    const step1Valid = validateStep1();
    const step2Valid = validateStep2();

    // Also check tags requirement
    const allErrors: Record<string, string | null> = {};
    if (!step1Valid) {
      Object.assign(allErrors, errors);
    }
    if (!step2Valid) {
      Object.assign(allErrors, errors);
    }
    if (formData.tags.length === 0) {
      allErrors.tags = 'Adicione pelo menos uma tag';
    }

    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      // Go back to first step that has errors
      if (!step1Valid) setStep(1);
      else if (!step2Valid) setStep(2);
      return;
    }

    setSubmitting(true);
    setToast(null);

    const businessData = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      category: formData.category,
      address: { ...formData.address, city: formData.address.city.trim() },
      tags: formData.tags,
      photos: formData.photos.map(f => f.name), // Store filenames; actual upload would be handled separately
      userId: user?.id || 'anonymous',
    };

    let apiSuccess = false;

    try {
      await axios.post('/api/businesses', businessData, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
      });
      apiSuccess = true;
    } catch (apiError) {
      console.warn('API fallback: salvando no localStorage', apiError);
      // API failed, continue to localStorage fallback
    }

    // Always save to localStorage as fallback
    try {
      saveBusiness(businessData);
      if (!apiSuccess) {
        console.log('Negócio salvo no localStorage como fallback');
      }
    } catch (localError) {
      console.error('Erro ao salvar no localStorage:', localError);
      setSubmitting(false);
      setToast({ message: 'Erro ao salvar. Tente novamente.', type: 'error' });
      return;
    }

    // Show success toast
    setToast({ message: 'Negócio cadastrado com sucesso! 🎉', type: 'success' });

    // Navigate after a short delay
    setTimeout(() => {
      setSubmitting(false);
      navigate('/');
    }, 1500);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFormData(prev => ({ ...prev, photos: Array.from(e.target.files!) }));
    }
  };

  const goToStep2 = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  const goToStep3 = () => {
    if (validateStep2()) {
      setStep(3);
    }
  };

  // --- Loading State ---

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-creme-andino">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-aji-rojo border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-creme-andino">
        <p className="text-gray-600 dark:text-gray-400">Acesso negado</p>
      </div>
    );
  }

  // --- Step Renderers ---

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-noche-lima rounded-2xl shadow-lg p-8 border border-oro-inca/20">
        <h2 className="font-playfair text-2xl font-bold text-aji-rojo mb-6">Informações Básicas</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nome do Negócio <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                clearError('name');
              }}
              className={`w-full p-3 rounded-lg border bg-white dark:bg-noche-lima text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-aji-rojo transition-colors ${
                errors.name ? 'border-red-400' : 'border-oro-inca/30'
              }`}
              placeholder="Ex: El Ceviche de Lima"
              required
            />
            <FieldError message={errors.name} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Descrição <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => {
                setFormData({ ...formData, description: e.target.value });
                clearError('description');
              }}
              className={`w-full p-3 rounded-lg border bg-white dark:bg-noche-lima text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-aji-rojo transition-colors ${
                errors.description ? 'border-red-400' : 'border-oro-inca/30'
              }`}
              rows={4}
              placeholder="Descreva seu negócio em poucas palavras..."
              required
            />
            <FieldError message={errors.description} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Categoria <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full p-3 rounded-lg border border-oro-inca/30 bg-white dark:bg-noche-lima text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-aji-rojo"
              required
            >
              {CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
        </div>
        <button
          type="button"
          onClick={goToStep2}
          className="w-full bg-aji-rojo text-white py-3 rounded-xl font-semibold hover:bg-aji-rojo/90 transition-colors mt-6"
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Rua e Número <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.address.street}
              onChange={(e) => {
                setFormData({ ...formData, address: { ...formData.address, street: e.target.value } });
                clearError('street');
              }}
              className={`w-full p-3 rounded-lg border bg-white dark:bg-noche-lima text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-aji-rojo transition-colors ${
                errors.street ? 'border-red-400' : 'border-oro-inca/30'
              }`}
              placeholder="Rua Augusta, 2500"
              required
            />
            <FieldError message={errors.street} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Cidade <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.address.city}
                onChange={(e) => {
                  setFormData({ ...formData, address: { ...formData.address, city: e.target.value } });
                  clearError('city');
                }}
                className={`w-full p-3 rounded-lg border bg-white dark:bg-noche-lima text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-aji-rojo transition-colors ${
                  errors.city ? 'border-red-400' : 'border-oro-inca/30'
                }`}
                placeholder="São Paulo"
                required
              />
              <FieldError message={errors.city} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Estado <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.address.state}
                onChange={(e) => {
                  setFormData({ ...formData, address: { ...formData.address, state: e.target.value } });
                  clearError('state');
                }}
                className={`w-full p-3 rounded-lg border bg-white dark:bg-noche-lima text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-aji-rojo transition-colors ${
                  errors.state ? 'border-red-400' : 'border-oro-inca/30'
                }`}
                required
              >
                <option value="">Selecione o estado</option>
                {BRAZIL_STATES.map(state => (
                  <option key={state.sigla} value={state.sigla}>
                    {state.sigla} - {state.nome}
                  </option>
                ))}
              </select>
              <FieldError message={errors.state} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CEP</label>
              <input
                type="text"
                value={formData.address.zip}
                onChange={(e) => handleZipChange(e.target.value)}
                placeholder="XXXXX-XXX"
                maxLength={9}
                className={`w-full p-3 rounded-lg border bg-white dark:bg-noche-lima text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-aji-rojo transition-colors ${
                  errors.zip ? 'border-red-400' : 'border-oro-inca/30'
                }`}
              />
              <FieldError message={errors.zip} />
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
            onClick={goToStep3}
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tags <span className="text-red-500">*</span>
            </label>
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
                  clearError('tags');
                }
              }}
              className={`w-full p-3 rounded-lg border bg-white dark:bg-noche-lima text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-aji-rojo transition-colors ${
                errors.tags ? 'border-red-400' : 'border-oro-inca/30'
              }`}
            />
            <FieldError message={errors.tags} />
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.tags.map((tag, i) => (
                <span
                  key={i}
                  className="bg-oro-inca/20 text-oro-inca px-2 py-1 rounded-full text-sm font-medium flex items-center gap-1"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, tags: formData.tags.filter((_, j) => j !== i) })}
                    className="hover:text-aji-rojo"
                  >
                    ×
                  </button>
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
                  <img
                    src={URL.createObjectURL(file)}
                    alt={`Foto ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, photos: formData.photos.filter((_, j) => j !== i) })}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                  >
                    ×
                  </button>
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
            disabled={submitting}
            className="bg-aji-rojo text-white px-6 py-2 rounded-xl font-semibold hover:bg-aji-rojo/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Salvando...
              </>
            ) : (
              'Finalizar Cadastro'
            )}
          </button>
        </div>
      </div>
    </div>
  );

  // --- Main Render ---

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Toast */}
      <Toast
        message={toast?.message || ''}
        type={toast?.type || 'success'}
        visible={!!toast}
        onClose={() => setToast(null)}
      />

      <h1 className="font-playfair text-3xl md:text-4xl font-bold text-aji-rojo mb-8 text-center">
        Cadastre seu Negócio
      </h1>
      <p className="text-center text-gray-600 dark:text-gray-400 mb-12 max-w-2xl mx-auto">
        Preencha as informações abaixo para cadastrar seu negócio gratuitamente no SaborPeruano
      </p>

      {/* Progress indicator */}
      <div className="flex justify-center items-center gap-2 mb-8">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                step === s
                  ? 'bg-aji-rojo text-white'
                  : step > s
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}
            >
              {step > s ? '✓' : s}
            </div>
            {s < 3 && (
              <div className={`w-8 h-0.5 transition-colors ${step > s ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
          </motion.div>
        </AnimatePresence>
      </form>
    </div>
  );
};
