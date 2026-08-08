// src/pages/SuperAdmin.tsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth, useUser } from '@clerk/clerk-react';
import {
  Eye,
  Check,
  X,
  Trash,
  MagnifyingGlass,
  Storefront,
  Hourglass,
  CheckCircle,
  XCircle,
  Prohibit,
  Flask,
} from '@phosphor-icons/react';
import {
  adminListBusinesses,
  adminApprove,
  adminReject,
  adminDelete,
  adminGetBetaMode,
  adminSetBetaMode,
  type ApiBusiness as Business,
} from '../lib/api';

// ── Helpers ──

const CATEGORIES: Record<string, string> = {
  restaurante: 'Restaurante',
  mercado: 'Mercado',
  cafe: 'Café',
  servicos: 'Serviços',
  salud: 'Saúde',
  juridico: 'Jurídico',
  financiero: 'Financeiro',
  imuebles: 'Imóveis',
};

function formatDate(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCnpj(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12)
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

const ITEMS_PER_PAGE = 10;

// ── Status Badge ──

function StatusBadge({ status }: { status: string | undefined }) {
  const cfg: Record<string, { dot: string; pill: string; label: string }> = {
    pending: { dot: 'bg-amber-500', pill: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-400/20', label: 'Pendente' },
    approved: { dot: 'bg-emerald-500', pill: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-400/20', label: 'Aprovado' },
    rejected: { dot: 'bg-rose-500', pill: 'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-900/30 dark:text-rose-300 dark:ring-rose-400/20', label: 'Rejeitado' },
    disabled: { dot: 'bg-zinc-400', pill: 'bg-zinc-100 text-zinc-600 ring-zinc-500/20 dark:bg-zinc-800 dark:text-zinc-400 dark:ring-zinc-400/20', label: 'Desabilitado' },
  };
  const s = status || 'pending';
  const c = cfg[s] || cfg.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ring-inset ${c.pill}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

// ── Subscription Badge ──

function SubBadge({ business }: { business: Business }) {
  const sub = business.subscriptionStatus;
  if (sub === 'trial') {
    const ends = business.trialEndsAt
      ? ` até ${new Date(business.trialEndsAt).toLocaleDateString('pt-BR')}`
      : '';
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ring-inset bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-900/30 dark:text-sky-300 dark:ring-sky-400/20">
        <Flask size={12} weight="fill" />
        Trial{ends}
      </span>
    );
  }
  if (sub === 'active') return <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400"><span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5" />Ativo</span>;
  if (sub === 'past_due') return <span className="text-xs font-medium text-orange-600 dark:text-orange-400"><span className="inline-block h-1.5 w-1.5 rounded-full bg-orange-500 mr-1.5" />Past Due</span>;
  if (sub === 'canceled') return <span className="text-xs font-medium text-zinc-500"><span className="inline-block h-1.5 w-1.5 rounded-full bg-zinc-400 mr-1.5" />Cancelado</span>;
  return null;
}

// ── Toast ──

function Toast({
  message,
  type,
  visible,
  onClose,
}: {
  message: string;
  type: 'success' | 'error';
  visible: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (visible) {
      const t = setTimeout(onClose, 4000);
      return () => clearTimeout(t);
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
          <span className="text-xl">{type === 'success' ? '✅' : '❌'}</span>
          <span className="font-medium text-sm">{message}</span>
          <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100 transition-opacity">
            ✕
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Confirm Modal ──

function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  danger,
  loading,
  loadingLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-noche-lima rounded-2xl shadow-2xl border border-oro-inca/20 p-6 max-w-md w-full"
      >
        <h3 className="font-playfair text-xl font-bold text-noche-lima dark:text-white mb-2">{title}</h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-oro-inca/30 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 py-2.5 rounded-xl font-semibold text-white transition-colors disabled:opacity-60 disabled:cursor-wait ${
              danger
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-aji-rojo hover:bg-aji-rojo/90'
            }`}
          >
            {loading ? `⏳ ${loadingLabel || 'Aguarde...'}` : (confirmLabel || 'Confirmar')}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Reject Modal ──

function RejectModal({
  open,
  loading,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  loading?: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    if (!reason.trim()) {
      setError('O motivo da rejeição é obrigatório.');
      return;
    }
    // Keep the reason visible while the request is in flight (BUG-020).
    onConfirm(reason.trim());
  };

  const handleCancel = () => {
    setReason('');
    setError('');
    onCancel();
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-noche-lima rounded-2xl shadow-2xl border border-oro-inca/20 p-6 max-w-md w-full"
      >
        <h3 className="font-playfair text-xl font-bold text-aji-rojo mb-2">❌ Rejeitar Negócio</h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
          Informe o motivo da rejeição. O proprietário receberá esta mensagem.
        </p>
        <textarea
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            if (error) setError('');
          }}
          disabled={loading}
          rows={4}
          placeholder="Ex: Documentos incompletos, informações inconsistentes..."
          className={`w-full p-3 rounded-lg border bg-white dark:bg-noche-lima text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-aji-rojo transition-colors resize-none disabled:opacity-60 ${
            error ? 'border-red-400' : 'border-oro-inca/30'
          }`}
        />
        {error && <p className="text-red-500 text-xs mt-1">⚠ {error}</p>}
        <div className="flex gap-3 mt-4">
          <button onClick={handleCancel} disabled={loading} className="flex-1 py-2.5 rounded-xl border border-oro-inca/30 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            Cancelar
          </button>
          <button onClick={handleConfirm} disabled={loading} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-wait">
            {loading ? '⏳ Rejeitando...' : 'Rejeitar'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Detail Modal ──

function DetailModal({
  business,
  open,
  onClose,
}: {
  business: Business | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!open || !business) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-noche-lima rounded-2xl shadow-2xl border border-oro-inca/20 p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="font-playfair text-2xl font-bold text-noche-lima dark:text-white">
              {business.name}
            </h2>
            <StatusBadge status={business.status} />
            <SubBadge business={business} />
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors text-gray-500"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide mb-0.5">Proprietário</p>
            <p className="text-noche-lima dark:text-white font-medium">{business.ownerFullName || '—'}</p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide mb-0.5">CNPJ</p>
            <p className="text-noche-lima dark:text-white font-medium">
              {business.cnpj ? formatCnpj(business.cnpj) : '—'}
            </p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide mb-0.5">Cidade de Origem (Peru)</p>
            <p className="text-noche-lima dark:text-white font-medium">{business.ownerBirthCity || '—'}</p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide mb-0.5">Categoria</p>
            <p className="text-noche-lima dark:text-white font-medium">{CATEGORIES[business.category] || business.category}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide mb-0.5">Endereço</p>
            <p className="text-noche-lima dark:text-white">
              {business.address?.street || '—'}, {business.address?.city || ''} - {business.address?.state || ''}
              {business.address?.zip ? `, ${business.address.zip}` : ''}
            </p>
          </div>
          <div className="md:col-span-2">
            <p className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide mb-0.5">Descrição</p>
            <p className="text-noche-lima dark:text-white">{business.description}</p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide mb-0.5">Subscription</p>
            <p className="text-noche-lima dark:text-white font-medium capitalize">
              {business.subscriptionStatus || 'none'}
              {business.trialEndsAt ? ` (trial até ${new Date(business.trialEndsAt).toLocaleDateString('pt-BR')})` : ''}
            </p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide mb-0.5">Data de Criação</p>
            <p className="text-noche-lima dark:text-white">{formatDate(business.createdAt)}</p>
          </div>
          {business.approvedAt && (
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide mb-0.5">Aprovado em</p>
              <p className="text-noche-lima dark:text-white">{formatDate(business.approvedAt)}</p>
            </div>
          )}
          {business.rejectionReason && (
            <div className="md:col-span-2">
              <p className="text-red-500 text-xs uppercase tracking-wide mb-0.5">Motivo da Rejeição</p>
              <p className="text-red-600 dark:text-red-400 font-medium bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">
                {business.rejectionReason}
              </p>
            </div>
          )}
        </div>

        {/* Tags */}
        {business.tags && business.tags.length > 0 && (
          <div className="mt-4">
            <p className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide mb-1">Tags</p>
            <div className="flex flex-wrap gap-1.5">
              {business.tags.map((tag, i) => (
                <span key={i} className="bg-oro-inca/20 text-oro-inca px-2 py-0.5 rounded-full text-xs font-medium">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Photos */}
        {business.photos && business.photos.length > 0 && (
          <div className="mt-4">
            <p className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide mb-1">
              Fotos ({business.photos.length})
            </p>
            <div className="grid grid-cols-4 gap-2">
              {business.photos.map((photo, i) => (
                <div key={i} className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-zinc-800">
                  <img
                    src={photo.startsWith('blob:') || photo.startsWith('http') || photo.startsWith('data:') ? photo : `/uploads/${photo}`}
                    alt={`${business.name} ${i + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23e5e7eb" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%239ca3af" font-size="12">📷</text></svg>';
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ── Stats Card ──

function StatsCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border p-5 ${color}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider opacity-70">{label}</p>
          <p className="text-3xl font-bold mt-1.5 tabular-nums leading-none">{value}</p>
        </div>
        <span className="p-2 rounded-xl bg-white/60 dark:bg-black/20 shadow-sm">{icon}</span>
      </div>
    </div>
  );
}

// ── Main Component ──

export const SuperAdmin = () => {
  const { getToken, isLoaded } = useAuth();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [search, setSearch] = useState('');
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [page, setPage] = useState(1);
  const [betaMode, setBeta] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [detailBusiness, setDetailBusiness] = useState<Business | null>(null);
  const [rejectBusiness, setRejectBusiness] = useState<Business | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'approve' | 'delete';
    business: Business;
  } | null>(null);

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const closeToast = useCallback(() => setToast(null), []);

  // Load data + beta mode from API (Clerk token verified server-side)
  const refresh = useCallback(async () => {
    if (!isLoaded) return;
    const token = await getToken();
    if (!token) {
      setLoading(false);
      setToast({ message: 'Não foi possível obter sessão Clerk.', type: 'error' });
      return;
    }
    try {
      const [list, beta] = await Promise.all([
        adminListBusinesses(token, { status: 'ALL', limit: 100 }),
        adminGetBetaMode(token),
      ]);
      // Normalize API payload into the display shape used by the modals
      const normalized: Business[] = (list.businesses || []).map((b) => ({
        ...b,
        ownerFullName: b.owner?.name || b.ownerFullName,
        address: {
          street: b.city || '',
          city: b.city || '',
          state: b.state || '',
          zip: '',
        },
      }));
      setBusinesses(normalized);
      setBeta(beta.betaMode);
    } catch (err: any) {
      setToast({ message: err?.message || 'Erro ao carregar negócios.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [isLoaded, getToken]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Actions (via API)
  const handleApprove = useCallback(
    async (business: Business) => {
      setPendingAction('approve');
      try {
        const token = await getToken();
        if (!token) throw new Error('Sem sessão');
        await adminApprove(token, business.id);
        setConfirmAction(null);
        setToast({ message: `${business.name} aprovado com sucesso! 🎉`, type: 'success' });
        await refresh();
      } catch (err: any) {
        setToast({ message: err?.message || 'Erro ao aprovar.', type: 'error' });
      } finally {
        setPendingAction(null);
      }
    },
    [getToken, refresh]
  );

  const handleReject = useCallback(
    async (business: Business, reason: string) => {
      setPendingAction('reject');
      try {
        const token = await getToken();
        if (!token) throw new Error('Sem sessão');
        await adminReject(token, business.id, reason);
        setRejectBusiness(null);
        setToast({ message: `${business.name} rejeitado.`, type: 'success' });
        await refresh();
      } catch (err: any) {
        setToast({ message: err?.message || 'Erro ao rejeitar.', type: 'error' });
      } finally {
        setPendingAction(null);
      }
    },
    [getToken, refresh]
  );

  const handleDelete = useCallback(
    async (business: Business) => {
      setPendingAction('delete');
      try {
        const token = await getToken();
        if (!token) throw new Error('Sem sessão');
        await adminDelete(token, business.id);
        setConfirmAction(null);
        setDetailBusiness(null);
        setToast({ message: `${business.name} excluído permanentemente.`, type: 'success' });
        await refresh();
      } catch (err: any) {
        setToast({ message: err?.message || 'Erro ao excluir.', type: 'error' });
      } finally {
        setPendingAction(null);
      }
    },
    [getToken, refresh]
  );

  const handleBetaToggle = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) throw new Error('Sem sessão');
      const next = !betaMode;
      const res = await adminSetBetaMode(token, next);
      setBeta(res.betaMode);
      setToast({
        message: res.betaMode ? 'Modo Beta ativado 🟡' : 'Modo Produção ativado 🟢',
        type: 'success',
      });
      await refresh();
    } catch (err: any) {
      setToast({ message: err?.message || 'Erro ao alterar modo beta.', type: 'error' });
    }
  }, [getToken, betaMode, refresh]);


  // Compute stats
  const stats = useMemo(() => {
    const total = businesses.length;
    const pendentes = businesses.filter((b) => (b.status || 'pending') === 'pending').length;
    const aprovados = businesses.filter((b) => b.status === 'approved').length;
    const rejeitados = businesses.filter((b) => b.status === 'rejected').length;
    const desabilitados = businesses.filter((b) => b.status === 'disabled').length;
    const emTrial = businesses.filter((b) => b.subscriptionStatus === 'trial').length;
    return { total, pendentes, aprovados, rejeitados, desabilitados, emTrial };
  }, [businesses]);

  // Filter and search
  const filtered = useMemo(() => {
    let list = businesses;
    if (statusFilter !== 'todos') {
      if (statusFilter === 'trial') {
        list = list.filter((b) => b.subscriptionStatus === 'trial');
      } else {
        list = list.filter((b) => (b.status || 'pending') === statusFilter);
      }
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      // CNPJ is stored as digits-only but displayed formatted; normalize the
      // query so '11.222.333/0001-81' and '11222333000181' both match.
      const qDigits = q.replace(/\D/g, '');
      list = list.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          (b.cnpj || '').toLowerCase().includes(q) ||
          (qDigits && (b.cnpj || '').includes(qDigits))
      );
    }
    return list;
  }, [businesses, statusFilter, search]);

  // Paginate
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  // Reset page when filter/search changes
  useEffect(() => {
    setPage(1);
  }, [statusFilter, search]);

  // ── Render ──

  // Route guard: only the hardcoded superadmin Clerk account may see the panel.
  // (Same check as Navbar; the server enforces it via requireSuperAdmin.)
  const { user } = useUser();
  const SUPERADMIN_CLERK_ID = 'user_3GsBXtg23VQOhHPN3HCF1oCN4Eq';

  if (!user || user.id !== SUPERADMIN_CLERK_ID) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-creme-andino dark:bg-zinc-950">
        <div className="text-center px-4">
          <div className="text-5xl mb-4">❌</div>
          <h1 className="font-playfair text-2xl font-bold text-noche-lima dark:text-white mb-2">
            Acesso negado
          </h1>
          <p className="text-gray-500 dark:text-gray-400">Se requiere rol superadmin.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-creme-andino dark:bg-zinc-950">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-aji-rojo border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Toast */}
      <Toast message={toast?.message || ''} type={toast?.type || 'success'} visible={!!toast} onClose={closeToast} />

      {/* Confirm Modals */}
      <ConfirmModal
        open={confirmAction?.type === 'approve'}
        title="✅ Aprovar Negócio"
        message={`Tem certeza que deseja aprovar "${confirmAction?.business?.name}"? O proprietário receberá acesso trial de 30 dias.`}
        confirmLabel="Aprovar"
        loading={pendingAction === 'approve'}
        loadingLabel="Aprovando..."
        onConfirm={() => confirmAction && handleApprove(confirmAction.business)}
        onCancel={() => setConfirmAction(null)}
      />
      <ConfirmModal
        open={confirmAction?.type === 'delete'}
        title="🗑️ Excluir Negócio"
        message={`Tem certeza que deseja excluir permanentemente "${confirmAction?.business?.name}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        danger
        loading={pendingAction === 'delete'}
        loadingLabel="Excluindo..."
        onConfirm={() => confirmAction && handleDelete(confirmAction.business)}
        onCancel={() => setConfirmAction(null)}
      />
      <RejectModal
        open={!!rejectBusiness}
        loading={pendingAction === 'reject'}
        onConfirm={(reason) => rejectBusiness && handleReject(rejectBusiness, reason)}
        onCancel={() => setRejectBusiness(null)}
      />
      <DetailModal business={detailBusiness} open={!!detailBusiness} onClose={() => setDetailBusiness(null)} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <h1 className="font-playfair text-3xl md:text-4xl font-bold text-aji-rojo">
          👑 Painel Superadmin
        </h1>
        <button
          onClick={handleBetaToggle}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${
            betaMode
              ? 'bg-yellow-100 text-yellow-700 border border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700'
              : 'bg-green-100 text-green-700 border border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700'
          }`}
        >
          <span className="text-lg">{betaMode ? '🟡' : '🟢'}</span>
          {betaMode ? 'Modo Beta' : 'Produção'}
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        <StatsCard label="Total" value={stats.total} icon={<Storefront size={20} weight="duotone" />} color="bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200" />
        <StatsCard label="Pendentes" value={stats.pendentes} icon={<Hourglass size={20} weight="duotone" />} color="bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200" />
        <StatsCard label="Aprovados" value={stats.aprovados} icon={<CheckCircle size={20} weight="duotone" />} color="bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-200" />
        <StatsCard label="Rejeitados" value={stats.rejeitados} icon={<XCircle size={20} weight="duotone" />} color="bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-200" />
        <StatsCard label="Desabilitados" value={stats.desabilitados} icon={<Prohibit size={20} weight="duotone" />} color="bg-zinc-100 border-zinc-300 text-zinc-700 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300" />
        <StatsCard label="Em Trial" value={stats.emTrial} icon={<Flask size={20} weight="duotone" />} color="bg-purple-50 border-purple-200 text-purple-800 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-200" />
      </div>

      {/* Empty State */}
      {businesses.length === 0 && (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">📊</div>
          <h2 className="font-playfair text-2xl font-bold text-noche-lima dark:text-white mb-2">
            Bem-vindo ao painel superadmin
          </h2>
          <p className="text-gray-500 dark:text-gray-400">Nenhum negócio cadastrado ainda.</p>
        </div>
      )}

      {businesses.length > 0 && (
        <>
          {/* Search + Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <MagnifyingGlass size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome ou CNPJ..."
                className="w-full pl-10 p-3 rounded-xl border border-oro-inca/30 bg-white dark:bg-noche-lima text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-aji-rojo transition-shadow"
              />
            </div>
          </div>

          {/* Status Tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            {[
              { key: 'todos', label: 'Todos' },
              { key: 'pending', label: 'Pendentes' },
              { key: 'approved', label: 'Aprovados' },
              { key: 'rejected', label: 'Rejeitados' },
              { key: 'disabled', label: 'Desabilitados' },
              { key: 'trial', label: 'Trial' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all active:scale-[0.98] ${
                  statusFilter === tab.key
                    ? 'bg-aji-rojo text-white shadow-md shadow-aji-rojo/25'
                    : 'bg-white dark:bg-noche-lima text-gray-600 dark:text-gray-400 border border-oro-inca/20 hover:border-aji-rojo/50 hover:text-aji-rojo'
                }`}
              >
                {tab.label}
                {tab.key !== 'todos' && (
                  <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums ${
                    statusFilter === tab.key ? 'bg-white/20' : 'bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-gray-400'
                  }`}>
                    {tab.key === 'trial'
                      ? businesses.filter((b) => b.subscriptionStatus === 'trial').length
                      : businesses.filter((b) => (b.status || 'pending') === tab.key).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-noche-lima rounded-2xl shadow-lg border border-oro-inca/20 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-oro-inca/20 bg-gray-50/80 dark:bg-zinc-800/50">
                  <th className="text-left p-4 text-[11px] font-semibold uppercase tracking-wider text-noche-lima/60 dark:text-white/60">Nome</th>
                  <th className="text-left p-4 text-[11px] font-semibold uppercase tracking-wider text-noche-lima/60 dark:text-white/60 hidden md:table-cell">Dono</th>
                  <th className="text-left p-4 text-[11px] font-semibold uppercase tracking-wider text-noche-lima/60 dark:text-white/60 hidden lg:table-cell">CNPJ</th>
                  <th className="text-left p-4 text-[11px] font-semibold uppercase tracking-wider text-noche-lima/60 dark:text-white/60 hidden xl:table-cell">Cidade</th>
                  <th className="text-left p-4 text-[11px] font-semibold uppercase tracking-wider text-noche-lima/60 dark:text-white/60">Status</th>
                  <th className="text-left p-4 text-[11px] font-semibold uppercase tracking-wider text-noche-lima/60 dark:text-white/60 hidden sm:table-cell">Data</th>
                  <th className="text-left p-4 text-[11px] font-semibold uppercase tracking-wider text-noche-lima/60 dark:text-white/60">Ações</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500 dark:text-gray-400">
                      Nenhum resultado encontrado.
                    </td>
                  </tr>
                )}
                {paginated.map((biz) => (
                  <tr
                    key={biz.id}
                    className="border-b border-oro-inca/10 hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-colors"
                  >
                    <td className="p-4 font-medium text-noche-lima dark:text-white max-w-[180px] truncate">
                      {biz.name}
                    </td>
                    <td className="p-4 text-gray-600 dark:text-gray-400 hidden md:table-cell max-w-[120px] truncate">
                      {biz.ownerFullName || '—'}
                    </td>
                    <td className="p-4 text-gray-600 dark:text-gray-400 hidden lg:table-cell font-mono text-xs">
                      {biz.cnpj ? formatCnpj(biz.cnpj) : '—'}
                    </td>
                    <td className="p-4 text-gray-600 dark:text-gray-400 hidden xl:table-cell">
                      {biz.address?.city || '—'}
                    </td>
                    <td className="p-4">
                      <StatusBadge status={biz.status} />
                    </td>
                    <td className="p-4 text-gray-500 dark:text-gray-400 text-xs hidden sm:table-cell">
                      {formatDate(biz.createdAt)}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 flex-wrap">
                        <button
                          onClick={() => setDetailBusiness(biz)}
                          className="p-2 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/30 transition-all active:scale-95"
                          title="Ver detalhes"
                        >
                          <Eye size={16} />
                        </button>
                        {(biz.status || 'pending') !== 'approved' && (
                          <button
                            onClick={() => setConfirmAction({ type: 'approve', business: biz })}
                            className="p-2 rounded-lg border border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-900/30 transition-all active:scale-95"
                            title="Aprovar"
                          >
                            <Check size={16} weight="bold" />
                          </button>
                        )}
                        {(biz.status || 'pending') !== 'rejected' && (biz.status || 'pending') !== 'disabled' && (
                          <button
                            onClick={() => setRejectBusiness(biz)}
                            className="p-2 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-900/30 transition-all active:scale-95"
                            title="Rejeitar"
                          >
                            <X size={16} weight="bold" />
                          </button>
                        )}
                        <button
                          onClick={() => setConfirmAction({ type: 'delete', business: biz })}
                          className="p-2 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-900/30 transition-all active:scale-95"
                          title="Excluir"
                        >
                          <Trash size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border border-oro-inca/20 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Anterior
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                    p === page
                      ? 'bg-aji-rojo text-white'
                      : 'border border-oro-inca/20 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg border border-oro-inca/20 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Seguinte →
              </button>
            </div>
          )}

          {/* Info */}
          <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-4">
            Mostrando {paginated.length} de {filtered.length} negócios
            {statusFilter !== 'todos' && ` (filtro: ${statusFilter})`}
          </p>
        </>
      )}
    </div>
  );
};
