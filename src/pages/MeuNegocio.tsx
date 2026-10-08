// src/pages/MeuNegocio.tsx
import { useState, useEffect, useCallback } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Flask, XCircle, Prohibit } from '@phosphor-icons/react';
import { getMyBusinesses, getMyBusinessWithAds, updateMyBusiness, openStripeCheckout, openStripePortal, createBusinessAdCheckout, uploadAdImage, type ApiBusinessWithAds as Business, type MyBusinessAd, type ApiBusiness } from '../lib/api';
import { validateContactFields, type ContactFields, type ContactErrors } from '../lib/businessContact';
import { ContactFieldsForm } from '../components/ContactFieldsForm';
import { runPaymentMethodSetup } from '../lib/businessUpgradeFlow';
import { BusinessGallery } from '../components/BusinessGallery';
import { AdPublicationTerms } from '../components/AdPublicationTerms';
import { getAdStatusPresentation, AD_STATUS_TONE_CLASSES } from '../lib/adStatus';
import { showToast } from '../lib/toast';
import { formatCnpj, isValidCnpjFormat, onlyCnpjDigits } from '../lib/cnpj';
import { getBusinessStatusTone } from '../lib/businessStatus';

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
  const { t } = useTranslation();
  const [business, setBusiness] = useState<Business | null>(null);
  const [ownedBusinesses, setOwnedBusinesses] = useState<ApiBusiness[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('');
  const [myAds, setMyAds] = useState<MyBusinessAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  // Ad purchase state (Opción A+B: sidebar + featured en Comunidad)
  const [showAdForm, setShowAdForm] = useState(false);
  const [adTitle, setAdTitle] = useState('');
  const [adImageUrl, setAdImageUrl] = useState('');
  const [adImagePreview, setAdImagePreview] = useState<string | null>(null);
  const [adImageFile, setAdImageFile] = useState<File | null>(null);
  const [uploadingAdImage, setUploadingAdImage] = useState(false);
  const [adTargetUrl, setAdTargetUrl] = useState('');
  // Terms acceptance, required to submit an ad for review (not for a draft).
  // The version comes from the backend so the client cannot submit a stale one.
  const [adTermsAccepted, setAdTermsAccepted] = useState(false);
  const [adTermsVersion, setAdTermsVersion] = useState<string | null>(null);
  const [buyingAd, setBuyingAd] = useState(false);
  const [settingUpPayment, setSettingUpPayment] = useState(false);
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
  // Contact details backing the public TELEFONE / WHATSAPP / COMO CHEGAR
  // buttons. Kept in its own state because it is a nested object, not a flat
  // field like the rest of the form.
  const [contact, setContact] = useState<ContactFields>({});
  const [contactErrors, setContactErrors] = useState<ContactErrors>({});
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
    // The API stores contact as a loose JSON column, so read each key
    // defensively rather than trusting the object's shape.
    const c = (b.contact as Record<string, string> | null) || {};
    setContact({
      phone: c.phone || '',
      whatsapp: c.whatsapp || '',
      email: c.email || '',
      website: c.website || '',
      mapsUrl: c.mapsUrl || '',
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
      const list = await getMyBusinesses(token);
      setOwnedBusinesses(list.businesses);
      const targetBusinessId = selectedBusinessId || list.businesses[0]?.id;
      if (!targetBusinessId) {
        setBusiness(null);
        setMyAds([]);
        setLoadError(null);
        return;
      }
      const mine = await getMyBusinessWithAds(token, targetBusinessId);
      if (mine) {
        setSelectedBusinessId(mine.id);
        hydrate(mine);
        setMyAds(mine.ads || []);
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
  }, [isLoaded, getToken, hydrate, selectedBusinessId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Stripe redirect back from ad checkout (?ad=success) — confirm + clean URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('ad') === 'success') {
      showToast('Pagamento confirmado! Seu anúncio está ativo por 30 dias. 🎉', 'success');
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('ad') === 'cancel') {
      showToast('Pagamento cancelado. Você pode tentar novamente quando quiser.', 'error');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const persistPhotos = useCallback(
    async (_businessId: string, newPhotos: string[]) => {
      const token = await getToken();
      if (!token) throw new Error('Sem sessão');
      const updated = await updateMyBusiness(token, { businessId: _businessId, photos: newPhotos });
      setBusiness(updated);
    },
    [getToken]
  );

  const handleSave = async () => {
    if (!business || !user) return;
    if (business.status === 'disabled') {
      showToast('Negócio desabilitado — edição não permitida.', 'error');
      setIsEditing(false);
      return;
    }
    // Validate before saving: an invalid Maps link would make the public
    // "Como chegar" button point somewhere wrong.
    const errs = validateContactFields(contact);
    if (Object.keys(errs).length > 0) {
      setContactErrors(errs);
      showToast('Revise os dados de contato antes de salvar.', 'error');
      return;
    }
    if (!cnpj.trim() || !isValidCnpjFormat(cnpj)) {
      showToast('Informe um CNPJ válido antes de salvar.', 'error');
      return;
    }
    setContactErrors({});
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
        contact,
        businessId: business.id,
        cnpj: onlyCnpjDigits(cnpj),
        ownerFullName: ownerFullName || undefined,
        ownerBirthCity: ownerBirthCity || undefined,
      });

      hydrate(updated);
      showToast('Dados atualizados com sucesso! ✅', 'success');
      setIsEditing(false);
    } catch (err: any) {
      showToast(err?.message || 'Erro ao salvar. Tente novamente.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!business) return;
    if (business.status === 'disabled') {
      showToast('Negócio desabilitado — gerencie sua assinatura no Portal Stripe.', 'error');
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
          showToast(res.betaMode ? 'Modo Beta ativo — assinatura de teste concedida. 🧪' : 'Checkout não disponível.', 'success');
          return;
        }
      }
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      showToast(err?.message || 'Erro ao abrir assinatura.', 'error');
    }
  };

  const handleSetupPaymentMethod = async () => {
    if (!business) return;
    setSettingUpPayment(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Sem sessão');
      const result = await runPaymentMethodSetup({ token, business, openStripeCheckout });
      if (result.kind === 'redirect') {
        window.open(result.url, '_blank', 'noopener,noreferrer');
        return;
      }
      showToast(result.message || t('businessUpgrade.ownerPanel.checkoutUnavailable'), 'error');
    } catch (err: any) {
      showToast(err?.message || t('businessUpgrade.ownerPanel.checkoutError'), 'error');
    } finally {
      setSettingUpPayment(false);
    }
  };

  const handleAdImageFile = (file: File | null) => {
    // Clean up any previous object URL
    if (adImagePreview && adImagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(adImagePreview);
    }
    if (!file) {
      setAdImageFile(null);
      setAdImagePreview(null);
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showToast('Tipo não suportado. Permitidos: JPEG, PNG, WebP', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Arquivo muito grande. Máximo: 5MB', 'error');
      return;
    }
    setAdImageFile(file);
    setAdImagePreview(URL.createObjectURL(file));
    // Clear the URL input when a local file is chosen (and vice-versa handled in the input)
    setAdImageUrl('');
  };

  const handleBuyAd = async (saveAsDraft = false) => {
    if (!business || !adTitle.trim()) return;
    // Submitting for publication requires the terms; a draft does not.
    if (!saveAsDraft && (!adTermsAccepted || !adTermsVersion)) return;
    setBuyingAd(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Sem sessão');
      // Local file takes precedence over a URL — upload first, then use its blob URL.
      let imageUrl = adImageUrl.trim() || undefined;
      if (adImageFile) {
        setUploadingAdImage(true);
        const uploaded = await uploadAdImage(token, business.id, adImageFile);
        imageUrl = uploaded.url;
      }
      const res = await createBusinessAdCheckout(token, {
        businessId: business.id,
        title: adTitle.trim(),
        imageUrl,
        targetUrl: adTargetUrl.trim() || undefined,
        ...(saveAsDraft
          ? { saveAsDraft: true }
          : { acceptedTermsVersion: adTermsVersion as string }),
      });

      const resetForm = () => {
        setShowAdForm(false);
        setAdTitle('');
        setAdImageUrl('');
        setAdImageFile(null);
        if (adImagePreview && adImagePreview.startsWith('blob:')) URL.revokeObjectURL(adImagePreview);
        setAdImagePreview(null);
        setAdTargetUrl('');
        setAdTermsAccepted(false);
      };

      if (res.status === 'draft') {
        showToast(res.message || 'Rascunho salvo. Ele não foi enviado para análise.', 'success');
        resetForm();
        refresh();
      } else if (res.betaMode) {
        showToast(res.message || 'Anúncio enviado para análise. 🧪', 'success');
        resetForm();
        refresh();
      } else if (res.url) {
        window.open(res.url, '_blank', 'noopener,noreferrer');
        resetForm();
      }
    } catch (err: any) {
      showToast(err?.message || 'Erro ao criar o anúncio.', 'error');
    } finally {
      setUploadingAdImage(false);
      setBuyingAd(false);
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
          Registre seu negócio pelo fluxo próprio para empresários e solicite a avaliação da listagem no diretório.
        </p>
        <button
          onClick={() => navigate('/registrar-negocio')}
          className="bg-aji-rojo text-white px-8 py-3 rounded-xl font-semibold hover:bg-aji-rojo/90 transition-colors"
        >
          Registrar Meu Negócio
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <h1 className="font-playfair text-3xl md:text-4xl font-bold text-aji-rojo">
          Meu Negócio
        </h1>
        {ownedBusinesses.length > 1 && (
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Gerenciar negócio
            <select
              value={selectedBusinessId}
              onChange={(event) => {
                setIsEditing(false);
                setSelectedBusinessId(event.target.value);
              }}
              className="mt-1 block min-w-64 rounded-xl border border-oro-inca/30 bg-white p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-aji-rojo dark:bg-noche-lima dark:text-gray-300"
            >
              {ownedBusinesses.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name || 'Negócio sem nome'} — {item.status || 'pending'}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {/* Status badge — mais visível */}
      {business.status === 'pending' && (
        <div className="mb-6 p-5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="font-semibold text-amber-800 dark:text-amber-200">{t('businessUpgrade.ownerPanel.pendingTitle')}</h3>
              <p className="text-amber-700 dark:text-amber-300 text-sm mt-1 max-w-2xl">
                {t('businessUpgrade.ownerPanel.pendingBody')}
              </p>
            </div>
            <button
              onClick={handleSetupPaymentMethod}
              disabled={settingUpPayment}
              className="shrink-0 rounded-lg bg-aji-rojo px-4 py-2 text-sm font-semibold text-white hover:bg-aji-rojo/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {settingUpPayment ? t('businessUpgrade.ownerPanel.openingCheckout') : t('businessUpgrade.ownerPanel.setupPayment')}
            </button>
          </div>
        </div>
      )}
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
        {(() => {
          const tone = getBusinessStatusTone(business.status);
          return (
            <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold ring-1 ring-inset ${tone.badgeClass}`}>
              <span className={`h-2 w-2 rounded-full ${tone.dotClass}`} />
              {tone.label}
            </span>
          );
        })()}
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
        {/* Ads are a complementary product, NOT a subscription benefit, so the
            subscription status is deliberately not consulted here. */}
        {business.status === 'approved' && (
          <button
            onClick={() => setShowAdForm(!showAdForm)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-aji-rojo/10 text-aji-rojo hover:bg-aji-rojo/20 border border-aji-rojo/30 transition-colors"
          >
            📢 {showAdForm ? 'Cancelar' : 'Impulsionar anúncio R$30/30 dias'}
          </button>
        )}
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Cadastrado em {new Date(business.createdAt).toLocaleDateString('pt-BR')}
        </span>
      </div>

      {/* Ad form — open to any approved business, regardless of subscription:
          ads are a complementary product, not a subscription benefit. */}
      {showAdForm && (
        <div className="mb-8 p-5 rounded-xl border border-aji-rojo/30 bg-aji-rojo/5 dark:bg-aji-rojo/10">
          <h3 className="font-semibold text-noche-lima dark:text-white mb-1 flex items-center gap-2">
            <span className="text-lg">📢</span> Anúncio na Comunidade — R$30 / 30 dias
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Seu anúncio aparece no sidebar da Comunidade e como card patrocinado acima da lista de temas (desktop e mobile).
          </p>
          {/* Stating the review step up front: an ad that does not appear
              immediately after payment would otherwise look like a failure. */}
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            <strong>Todo anúncio passa por análise antes de ser publicado.</strong> Os 30 dias
            começam a contar a partir da aprovação — você não perde dias durante a análise.
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título do anúncio *</label>
              <input
                type="text"
                value={adTitle}
                onChange={(e) => setAdTitle(e.target.value)}
                maxLength={120}
                placeholder="Ex: Promoção de ceviche no nosso restaurante"
                className="w-full p-3 rounded-lg border border-oro-inca/30 bg-white dark:bg-noche-lima text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-aji-rojo"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Imagem do anúncio (opcional)</label>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <input
                    type="url"
                    value={adImageUrl}
                    onChange={(e) => {
                      setAdImageUrl(e.target.value);
                      // Switching to a URL discards the local file choice.
                      if (e.target.value.trim()) {
                        if (adImagePreview && adImagePreview.startsWith('blob:')) URL.revokeObjectURL(adImagePreview);
                        setAdImagePreview(null);
                        setAdImageFile(null);
                      }
                    }}
                    disabled={!!adImageFile}
                    placeholder="Cole uma URL de imagem... (ou envie um arquivo abaixo)"
                    className="w-full p-3 rounded-lg border border-oro-inca/30 bg-white dark:bg-noche-lima text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-aji-rojo disabled:opacity-50"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    URL ou arquivo local (JPEG/PNG/WebP, máx. 5MB). Se vazio, usamos a primeira foto do seu negócio.
                  </p>
                </div>
                <label className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-oro-inca/30 text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-aji-rojo/50 hover:text-aji-rojo cursor-pointer transition-colors">
                  {uploadingAdImage ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 rounded-full border-2 border-oro-inca border-t-transparent animate-spin" />
                      Enviando...
                    </span>
                  ) : (
                    <>
                      <span className="text-base">📁</span>
                      {adImageFile ? 'Trocar arquivo' : 'Enviar arquivo'}
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    disabled={uploadingAdImage}
                    onChange={(e) => handleAdImageFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
              {adImagePreview && (
                <div className="relative mt-3 inline-block">
                  <img
                    src={adImagePreview}
                    alt="Preview do anúncio"
                    className="h-24 w-32 object-cover rounded-lg border border-oro-inca/30"
                  />
                  <button
                    type="button"
                    onClick={() => handleAdImageFile(null)}
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-aji-rojo text-white text-xs font-bold shadow hover:bg-aji-rojo/90 transition-colors"
                    aria-label="Remover imagem"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Link de destino (opcional)</label>
              <input
                type="url"
                value={adTargetUrl}
                onChange={(e) => setAdTargetUrl(e.target.value)}
                placeholder="https://... (se vazio, vai para a página do seu negócio)"
                className="w-full p-3 rounded-lg border border-oro-inca/30 bg-white dark:bg-noche-lima text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-aji-rojo"
              />
            </div>
            {/* Legal warning + acceptance, immediately above the submit
                button so it is read at the moment of commitment. */}
            <AdPublicationTerms
              accepted={adTermsAccepted}
              onAcceptedChange={setAdTermsAccepted}
              onVersionLoaded={setAdTermsVersion}
            />

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => handleBuyAd(false)}
                disabled={buyingAd || !adTitle.trim() || !adTermsAccepted || !adTermsVersion}
                className="px-5 py-2.5 bg-aji-rojo hover:bg-aji-rojo/90 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {buyingAd ? 'Processando...' : 'Pagar R$30 e enviar para análise'}
              </button>
              {/* A draft commits to nothing, so it needs no acceptance and is
                  never charged. */}
              <button
                onClick={() => handleBuyAd(true)}
                disabled={buyingAd || !adTitle.trim()}
                className="px-5 py-2.5 rounded-lg font-semibold border border-oro-inca/40 text-gray-700 dark:text-gray-300 hover:border-aji-rojo/50 hover:text-aji-rojo transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Salvar rascunho
              </button>
            </div>
            {!adTermsAccepted && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Para enviar o anúncio é necessário aceitar as normas de publicação acima.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Subscription detail (diferenciada de los anuncios) */}
      <div className="mb-6 bg-white dark:bg-noche-lima rounded-2xl shadow-lg border border-oro-inca/20 p-6">
        <h2 className="font-playfair text-xl font-bold text-noche-lima dark:text-white mb-4 flex items-center gap-2">
          🔑 Assinatura da página
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide mb-0.5">Plano</p>
            <p className="font-semibold text-noche-lima dark:text-white">Listagem ConectaPeru</p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide mb-0.5">Status</p>
            <p className="font-semibold capitalize text-noche-lima dark:text-white">
              {business.status === 'pending' ? t('businessUpgrade.ownerPanel.awaitingApproval') : business.subscriptionStatus || 'none'}
              {business.subscriptionStatus === 'active' && <span className="text-emerald-600 dark:text-emerald-400"> ●</span>}
            </p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide mb-0.5">Preço</p>
            <p className="font-semibold text-noche-lima dark:text-white">R$59/mês</p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide mb-0.5">Trial</p>
            <p className="font-semibold text-noche-lima dark:text-white">
              {business.status === 'pending'
                ? t('businessUpgrade.ownerPanel.trialNotStarted')
                : business.trialEndsAt
                ? new Date(business.trialEndsAt).toLocaleDateString('pt-BR')
                : '—'}
            </p>
          </div>
        </div>
        {business.status === 'pending' && (
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            {t('businessUpgrade.ownerPanel.paymentMethodNote')}
          </p>
        )}
        {business.status === 'approved' && (
          <button
            onClick={handleManageSubscription}
            className="mt-4 text-sm font-medium text-oro-inca hover:text-oro-inca/80 transition-colors"
          >
            {business.subscriptionStatus === 'active' || business.subscriptionStatus === 'past_due' ? 'Gerenciar no Portal Stripe →' : 'Assinar / Ativar plano →'}
          </button>
        )}
      </div>

      {/* Ads contratados (diferenciados de la suscripción) */}
      <div className="mb-8 bg-white dark:bg-noche-lima rounded-2xl shadow-lg border border-oro-inca/20 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-playfair text-xl font-bold text-noche-lima dark:text-white flex items-center gap-2">
            📢 Anúncios na Comunidade
          </h2>
          {business.status === 'approved' && business.subscriptionStatus === 'active' && (
            <button
              onClick={() => { setShowAdForm(!showAdForm); }}
              className="text-sm font-medium text-aji-rojo hover:text-aji-rojo/80 transition-colors"
            >
              {showAdForm ? 'Fechar' : '+ Contratar anúncio (R$30/mês)'}
            </button>
          )}
        </div>

        {myAds.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
            Nenhum anúncio contratado ainda.
            {business.subscriptionStatus === 'active'
              ? ' Contrate um anúncio para aparecer na Comunidade.'
              : ' A assinatura ativa é necessária para contratar anúncios.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-oro-inca/20 bg-gray-50/80 dark:bg-zinc-800/50">
                  <th className="text-left p-3 text-[11px] font-semibold uppercase tracking-wider text-noche-lima/60 dark:text-white/60">Título</th>
                  <th className="text-left p-3 text-[11px] font-semibold uppercase tracking-wider text-noche-lima/60 dark:text-white/60">Status</th>
                  <th className="text-left p-3 text-[11px] font-semibold uppercase tracking-wider text-noche-lima/60 dark:text-white/60 hidden sm:table-cell">Vigência</th>
                  <th className="text-left p-3 text-[11px] font-semibold uppercase tracking-wider text-noche-lima/60 dark:text-white/60 hidden md:table-cell">Contratado em</th>
                </tr>
              </thead>
              <tbody>
                {myAds.map((ad) => {
                  const presentation = getAdStatusPresentation(ad.status);
                  const tone = AD_STATUS_TONE_CLASSES[presentation.tone];
                  return (
                  <tr key={ad.id} className="border-b border-oro-inca/10 hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="p-3 font-medium text-noche-lima dark:text-white max-w-[220px]">
                      <div className="truncate">{ad.title}</div>
                      {/* The rejection reason belongs next to the ad it blocks:
                          an unexplained block cannot be acted on. */}
                      {ad.moderationReason && (
                        <p className="mt-1 text-xs font-normal text-red-600 dark:text-red-400 whitespace-pre-line">
                          <strong>Motivo:</strong> {ad.moderationReason}
                        </p>
                      )}
                      {ad.status === 'inactive_for_review' && (
                        <p className="mt-0.5 text-[11px] font-normal text-gray-500 dark:text-gray-400">
                          Análises usadas: {ad.reviewAttempts} de 3. Na terceira reprovação o
                          anúncio é encerrado e o valor pago é devolvido.
                        </p>
                      )}
                      {ad.refundedAt && (
                        <p className="mt-0.5 text-[11px] font-normal text-emerald-600 dark:text-emerald-400">
                          Valor devolvido em {new Date(ad.refundedAt).toLocaleDateString('pt-BR')}.
                        </p>
                      )}
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1 ring-inset ${tone.badge}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                        {presentation.label}
                      </span>
                      {presentation.hint && (
                        <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400 max-w-[220px]">
                          {presentation.hint}
                        </p>
                      )}
                    </td>
                    <td className="p-3 text-gray-600 dark:text-gray-400 text-xs hidden sm:table-cell">
                      {ad.startsAt && ad.endsAt
                        ? `${new Date(ad.startsAt).toLocaleDateString('pt-BR')} → ${new Date(ad.endsAt).toLocaleDateString('pt-BR')}`
                        : '—'}
                    </td>
                    <td className="p-3 text-gray-500 dark:text-gray-400 text-xs hidden md:table-cell">
                      {new Date(ad.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
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
                    {formatCnpj(cnpj)}
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

            {/* Contact details: these drive the public TELEFONE / WHATSAPP /
                COMO CHEGAR buttons. */}
            <div className="pt-4 border-t border-oro-inca/20">
              <ContactFieldsForm
                value={contact}
                errors={contactErrors}
                onChange={(next) => {
                  setContact(next);
                  // Drop the stale error the moment the owner edits a field.
                  setContactErrors({});
                }}
                disabled={saving}
              />
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
