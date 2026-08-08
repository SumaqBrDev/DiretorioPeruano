// src/pages/MeuNegocio.tsx
import { useState, useEffect, useCallback } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Flask, XCircle, Prohibit } from '@phosphor-icons/react';
import { getMyBusiness, updateMyBusiness, openStripeCheckout, openStripePortal, type ApiBusiness as Business } from '../lib/api';
import { BusinessGallery } from '../components/BusinessGallery';

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

const BRAZIL_STATES = [
  { sigla: 'AC', nome: 'Acre' }, { sigla: 'AL', nome: 'Alagoas' },
  { sigla: 'AP', nome: 'Amapá' }, { sigla: 'AM', nome: 'Amazonas' },
  { sigla: 'BA', nome: 'Bahia' }, { sigla: 'CE', nome: 'Ceará' },
  { sigla: 'DF', nome: 'Distrito Federal' }, { sigla: 'ES', nome: 'Espírito Santo' },
  { sigla: 'GO', nome: 'Goiás' }, { sigla: 'MA', nome: 'Maranhão' },
  { sigla: 'MT', nome: 'Mato Grosso' }, { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { sigla: 'MG', nome: 'Minas Gerais' }, { sigla: 'PA', nome: 'Pará' },
  { sigla: 'PB', nome: 'Paraíba' }, { sigla: 'PR', nome: 'Paraná' },
  { sigla: 'PE', nome: 'Pernambuco' }, { sigla: 'PI', nome: 'Piauí' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' }, { sigla: 'RN', nome: 'Rio Grande do Norte' },
  { sigla: 'RS', nome: 'Rio Grande do Sul' }, { sigla: 'RO', nome: 'Rondônia' },
  { sigla: 'RR', nome: 'Roraima' }, { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'SP', nome: 'São Paulo' }, { sigla: 'SE', nome: 'Sergipe' },
  { sigla: 'TO', nome: 'Tocantins' },
];

export const MeuNegocio = () => {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'restaurante',
    street: '',
    city: '',
    state: '',
    zip: '',
    tags: [] as string[],
  });
  const [newTag, setNewTag] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [cnpj, setCnpj] = useState('');
  const [ownerFullName, setOwnerFullName] = useState('');
  const [ownerBirthCity, setOwnerBirthCity] = useState('');

  const hydrate = useCallback((b: Business) => {
    setBusiness(b);
    setPhotos(b.photos || []);
    setCnpj(b.cnpj || '');
    setOwnerFullName(b.ownerFullName || '');
    setOwnerBirthCity(b.ownerBirthCity || '');
    setFormData({
      name: b.name || '',
      description: b.description || '',
      category: b.category || 'restaurante',
      street: (b.address as any)?.street || '',
      city: (b.address as any)?.city || '',
      state: (b.address as any)?.state || '',
      zip: (b.address as any)?.zip || '',
      tags: b.tags || [],
    });
  }, []);

  const refresh = useCallback(async () => {
    if (!isLoaded) return;
    const token = await getToken();
    if (!token) {
      setLoading(false);
      setLoadError('Não foi possível obter sessão Clerk.');
      return;
    }
    try {
      const mine = await getMyBusiness(token);
      if (mine) {
        hydrate(mine);
        setLoadError(null);
      }
    } catch (err: any) {
      // 404 = user has no business yet — that's the normal empty state
      if (err?.statusCode !== 404) {
        setLoadError(err?.message || 'Erro ao carregar seu negócio.');
      }
      setBusiness(null);
    } finally {
      setLoading(false);
    }
  }, [isLoaded, getToken, hydrate]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const persistPhotos = useCallback(
    async (_businessId: string, newPhotos: string[]) => {
      const token = await getToken();
      if (!token) throw new Error('Sem sessão');
      const updated = await updateMyBusiness(token, { photos: newPhotos });
      setBusiness(updated);
    },
    [getToken]
  );

  const handleSave = async () => {
    if (!business || !user) return;
    if (business.status === 'disabled') {
      setToast({ message: 'Negócio desabilitado — edição não permitida.', type: 'error' });
      setIsEditing(false);
      return;
    }
    setSaving(true);

    try {
      const token = await getToken();
      if (!token) throw new Error('Sem sessão');

      const updated = await updateMyBusiness(token, {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        address: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          zip: formData.zip,
        },
        tags: formData.tags,
        cnpj: cnpj || undefined,
        ownerFullName: ownerFullName || undefined,
        ownerBirthCity: ownerBirthCity || undefined,
      });

      hydrate(updated);
      setToast({ message: 'Dados atualizados com sucesso! ✅', type: 'success' });
      setIsEditing(false);
    } catch (err: any) {
      setToast({ message: err?.message || 'Erro ao salvar. Tente novamente.', type: 'error' });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 4000);
    }
  };

  const handleManageSubscription = async () => {
    if (!business) return;
    if (business.status === 'disabled') {
      setToast({ message: 'Negócio desabilitado — gerencie sua assinatura no Portal Stripe.', type: 'error' });
      return;
    }
    try {
      const token = await getToken();
      if (!token) throw new Error('Sem sessão');
      let url: string | undefined;
      if (business.subscriptionStatus === 'active' || business.subscriptionStatus === 'past_due') {
        const res = await openStripePortal(token, business.id);
        url = res.url;
      } else {
        const res = await openStripeCheckout(token, business.id);
        url = res.url || '';
        if (!url) {
          setToast({ message: res.betaMode ? 'Modo Beta ativo — assinatura de teste concedida. 🧪' : 'Checkout não disponível.', type: 'success' });
          return;
        }
      }
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      setToast({ message: err?.message || 'Erro ao abrir assinatura.', type: 'error' });
    }
  };

  const addTag = () => {
    const tag = newTag.trim();
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, tag] }));
    }
    setNewTag('');
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-creme-andino dark:bg-zinc-950">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-aji-rojo border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-creme-andino dark:bg-zinc-950">
        <p className="text-gray-600 dark:text-gray-400">Acesso negado</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-creme-andino dark:bg-zinc-950 p-6">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">⚠️</div>
          <p className="text-gray-700 dark:text-gray-300">{loadError}</p>
        </div>
      </div>
    );
  }

  const SUPERADMIN_CLERK_ID = 'user_3GsBXtg23VQOhHPN3HCF1oCN4Eq';
  const publicMeta = user?.publicMetadata || {};
  const isAdmin = (publicMeta.role === 'admin' || publicMeta.rol === 'admin');
  const isSuperAdmin = user?.id === SUPERADMIN_CLERK_ID;

  if (!business) {
    // Admin users without a business get redirected to the admin panel
    if (isAdmin || isSuperAdmin) {
      navigate(isSuperAdmin ? '/admin/super' : '/admin');
      return null;
    }

    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-6">📋</div>
        <h1 className="font-playfair text-3xl font-bold text-noche-lima dark:text-white mb-4">
          Você ainda não tem um negócio cadastrado
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
          Cadastre seu negócio gratuitamente e apareça no diretório para milhares de clientes.
        </p>
        <button
          onClick={() => navigate('/onboarding')}
          className="bg-aji-rojo text-white px-8 py-3 rounded-xl font-semibold hover:bg-aji-rojo/90 transition-colors"
        >
          Cadastrar Meu Negócio
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Toast */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-xl border ${
            toast.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/80 dark:border-green-700 dark:text-green-200'
              : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/80 dark:border-red-700 dark:text-red-200'
          }`}
        >
          {toast.message}
        </motion.div>
      )}

      <h1 className="font-playfair text-3xl md:text-4xl font-bold text-aji-rojo mb-8">
        Meu Negócio
      </h1>

      {/* Status badge — mais visível */}
      {business.status === 'rejected' && (
        <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl">
          <div className="flex items-start gap-3">
            <span className="p-2 rounded-lg bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-300"><XCircle size={20} weight="bold" /></span>
            <div>
              <h3 className="font-semibold text-rose-700 dark:text-rose-300">Negócio Rejeitado</h3>
              <p className="text-rose-600 dark:text-rose-400 text-sm mt-1">{business.rejectionReason}</p>
            </div>
          </div>
        </div>
      )}
      {business.status === 'disabled' && (
        <div className="mb-6 p-4 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl">
          <div className="flex items-start gap-3">
            <span className="p-2 rounded-lg bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300"><Prohibit size={20} weight="bold" /></span>
            <div>
              <h3 className="font-semibold text-zinc-700 dark:text-zinc-300">Negócio Desabilitado</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                Seu negócio foi desabilitado. Gerencie sua assinatura no{' '}
                <button
                  onClick={handleManageSubscription}
                  className="underline text-oro-inca hover:text-oro-inca/80 font-medium"
                >
                  Portal Stripe
                </button>{' '}
                para reativá-lo.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8 flex items-center gap-3 flex-wrap">
        <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold ring-1 ring-inset ${
          business.status === 'approved'
            ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-900/40 dark:text-emerald-300 dark:ring-emerald-400/20'
            : business.status === 'pending' || !business.status
            ? 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-900/40 dark:text-amber-300 dark:ring-amber-400/20'
            : business.status === 'rejected'
            ? 'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-900/40 dark:text-rose-300 dark:ring-rose-400/20'
            : business.status === 'disabled'
            ? 'bg-zinc-100 text-zinc-600 ring-zinc-500/20 dark:bg-zinc-800 dark:text-zinc-400 dark:ring-zinc-400/20'
            : 'bg-zinc-100 text-zinc-600 ring-zinc-500/20 dark:bg-zinc-800 dark:text-zinc-400 dark:ring-zinc-400/20'
        }`}>
          <span className={`h-2 w-2 rounded-full ${
            business.status === 'approved' ? 'bg-emerald-500'
            : business.status === 'pending' || !business.status ? 'bg-amber-500'
            : business.status === 'rejected' ? 'bg-rose-500'
            : 'bg-zinc-400'
          }`} />
          {business.status === 'approved' ? 'Aprovado' : business.status === 'pending' || !business.status ? 'Pendente de Aprovação' : business.status === 'rejected' ? 'Rejeitado' : business.status === 'disabled' ? 'Desabilitado' : business.status}
        </span>
        {business.subscriptionStatus === 'trial' && business.trialEndsAt && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-900/40 dark:text-sky-300 dark:ring-sky-400/20 ring-1 ring-inset">
            <Flask size={12} weight="fill" />
            Trial até {new Date(business.trialEndsAt).toLocaleDateString('pt-BR')}
          </span>
        )}
        {business.status === 'approved' && (
          <button
            onClick={handleManageSubscription}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-oro-inca/20 text-oro-inca hover:bg-oro-inca/30 border border-oro-inca/30 transition-colors"
          >
            🔑 {business.subscriptionStatus === 'active' || business.subscriptionStatus === 'past_due' ? 'Gerenciar Assinatura' : 'Assinar / Ativar'}
          </button>
        )}
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Cadastrado em {new Date(business.createdAt).toLocaleDateString('pt-BR')}
        </span>
      </div>

      <div className="bg-white dark:bg-noche-lima rounded-2xl shadow-lg border border-oro-inca/20 p-8">
        {!isEditing ? (
          /* === VIEW MODE === */
          <div className="space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="font-playfair text-2xl font-bold text-noche-lima dark:text-white">
                  {business.name}
                </h2>
                <span className="inline-block mt-1 px-3 py-1 bg-aji-rojo/10 text-aji-rojo rounded-full text-xs font-medium">
                  {CATEGORIES.find(c => c.value === business.category)?.label || business.category}
                </span>
              </div>
              {business.status !== 'disabled' && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-5 py-2 bg-oro-inca text-noche-lima rounded-xl font-semibold hover:bg-oro-inca/90 transition-colors text-sm"
                >
                  ✏️ Editar
                </button>
              )}
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Descrição</h3>
              <p className="text-gray-700 dark:text-gray-300">{business.description}</p>
            </div>

            {/* Novos campos: CNPJ, Proprietário, Cidade Origem */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {cnpj && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">CNPJ</h3>
                  <p className="text-gray-700 dark:text-gray-300 font-mono text-sm">
                    {cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')}
                  </p>
                </div>
              )}
              {ownerFullName && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Proprietário</h3>
                  <p className="text-gray-700 dark:text-gray-300">{ownerFullName}</p>
                </div>
              )}
              {ownerBirthCity && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Cidade de Origem (Peru)</h3>
                  <p className="text-gray-700 dark:text-gray-300">{ownerBirthCity}</p>
                </div>
              )}
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Endereço</h3>
                <p className="text-gray-700 dark:text-gray-300">
                  {business.address?.street || '—'}<br />
                  {business.address?.city ? `${business.address.city}, ` : ''}{business.address?.state || ''}<br />
                  {business.address?.zip || ''}
                </p>
              </div>
            </div>

            {business.tags && business.tags.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {business.tags.map((tag, i) => (
                    <span key={i} className="bg-oro-inca/20 text-oro-inca px-3 py-1 rounded-full text-sm font-medium">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* === EDIT MODE === */
          <div className="space-y-5">
            <h2 className="font-playfair text-2xl font-bold text-noche-lima dark:text-white mb-2">
              ✏️ Editar Dados
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome do Negócio</label>
              <input type="text" value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full p-3 rounded-lg border border-oro-inca/30 bg-white dark:bg-noche-lima text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-aji-rojo" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição</label>
              <textarea value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
                className="w-full p-3 rounded-lg border border-oro-inca/30 bg-white dark:bg-noche-lima text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-aji-rojo" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoria</label>
              <select value={formData.category}
                onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full p-3 rounded-lg border border-oro-inca/30 bg-white dark:bg-noche-lima text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-aji-rojo">
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rua e Número</label>
                <input type="text" value={formData.street}
                  onChange={e => setFormData(prev => ({ ...prev, street: e.target.value }))}
                  className="w-full p-3 rounded-lg border border-oro-inca/30 bg-white dark:bg-noche-lima text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-aji-rojo" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cidade</label>
                <input type="text" value={formData.city}
                  onChange={e => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  className="w-full p-3 rounded-lg border border-oro-inca/30 bg-white dark:bg-noche-lima text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-aji-rojo" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estado</label>
                <select value={formData.state}
                  onChange={e => setFormData(prev => ({ ...prev, state: e.target.value }))}
                  className="w-full p-3 rounded-lg border border-oro-inca/30 bg-white dark:bg-noche-lima text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-aji-rojo">
                  <option value="">Selecione</option>
                  {BRAZIL_STATES.map(s => <option key={s.sigla} value={s.sigla}>{s.sigla} - {s.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CEP</label>
                <input type="text" value={formData.zip}
                  onChange={e => setFormData(prev => ({ ...prev, zip: e.target.value.replace(/\D/g, '').slice(0, 8) }))}
                  placeholder="XXXXX-XXX"
                  className="w-full p-3 rounded-lg border border-oro-inca/30 bg-white dark:bg-noche-lima text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-aji-rojo" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags</label>
              <div className="flex gap-2">
                <input type="text" value={newTag}
                  onChange={e => setNewTag(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                  placeholder="Adicionar tag e Enter"
                  className="flex-1 p-3 rounded-lg border border-oro-inca/30 bg-white dark:bg-noche-lima text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-aji-rojo" />
                <button type="button" onClick={addTag}
                  className="px-4 py-2 bg-oro-inca/20 text-oro-inca rounded-lg font-medium hover:bg-oro-inca/30 transition-colors">
                  +
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.tags.map((tag, i) => (
                  <span key={i} className="bg-oro-inca/20 text-oro-inca px-2 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                    #{tag}
                    <button onClick={() => setFormData(prev => ({ ...prev, tags: prev.tags.filter((_, j) => j !== i) }))}
                      className="hover:text-aji-rojo">&times;</button>
                  </span>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button onClick={() => setIsEditing(false)}
                className="flex-1 py-3 rounded-xl border border-oro-inca/30 text-noche-lima dark:text-white font-semibold hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-3 rounded-xl bg-aji-rojo text-white font-semibold hover:bg-aji-rojo/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <> <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> Salvando...</> : '💾 Salvar'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ────── Galeria de Fotos ────── */}
      <div className="bg-white dark:bg-noche-lima rounded-2xl shadow-lg border border-oro-inca/20 p-8 mt-8">
        <BusinessGallery
          businessId={business.id}
          photos={photos}
          onPhotosChange={setPhotos}
          onPersistPhotos={persistPhotos}
        />
      </div>
    </div>
  );
};
