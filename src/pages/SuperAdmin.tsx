// src/pages/SuperAdmin.tsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  getBusinesses,
  updateBusiness,
  deleteBusiness,
  getBetaMode,
  setBetaMode,
} from '../lib/localData';
import type { Business } from '../lib/localData';

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
const SUPERADMIN_EMAIL = 'jose.rocah.pe@gmail.com';

// ── Status Badge ──

function StatusBadge({ status }: { status: string | undefined }) {
  const cfg: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: 'bg-yellow-100 dark:bg-yellow-900/40', text: 'text-yellow-700 dark:text-yellow-300', label: '⏳ Pendente' },
    approved: { bg: 'bg-green-100 dark:bg-green-900/40', text: 'text-green-700 dark:text-green-300', label: '✅ Aprovado' },
    rejected: { bg: 'bg-red-100 dark:bg-red-900/40', text: 'text-red-700 dark:text-red-300', label: '❌ Rejeitado' },
    disabled: { bg: 'bg-gray-200 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-400', label: '🚫 Desabilitado' },
  };
  const s = status || 'pending';
  const c = cfg[s] || cfg.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>
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
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
        🧪 Trial{ends}
      </span>
    );
  }
  if (sub === 'active') return <span className="text-xs text-green-600 dark:text-green-400">● Ativo</span>;
  if (sub === 'past_due') return <span className="text-xs text-orange-600 dark:text-orange-400">⚠ Past Due</span>;
  if (sub === 'canceled') return <span className="text-xs text-gray-500">✕ Cancelado</span>;
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
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
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
            className="flex-1 py-2.5 rounded-xl border border-oro-inca/30 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl font-semibold text-white transition-colors ${
              danger
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-aji-rojo hover:bg-aji-rojo/90'
            }`}
          >
            {confirmLabel || 'Confirmar'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Reject Modal ──

function RejectModal({
  open,
  onConfirm,
  onCancel,
}: {
  open: boolean;
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
    onConfirm(reason.trim());
    setReason('');
    setError('');
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
          rows={4}
          placeholder="Ex: Documentos incompletos, informações inconsistentes..."
          className={`w-full p-3 rounded-lg border bg-white dark:bg-noche-lima text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-aji-rojo transition-colors resize-none ${
            error ? 'border-red-400' : 'border-oro-inca/30'
          }`}
        />
        {error && <p className="text-red-500 text-xs mt-1">⚠ {error}</p>}
        <div className="flex gap-3 mt-4">
          <button onClick={handleCancel} className="flex-1 py-2.5 rounded-xl border border-oro-inca/30 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
            Cancelar
          </button>
          <button onClick={handleConfirm} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors">
            Rejeitar
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
                    src={photo.startsWith('blob:') || photo.startsWith('http') ? photo : `/uploads/${photo}`}
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
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className={`rounded-xl border p-5 ${color}`}>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm opacity-80 mt-1">{label}</p>
    </div>
  );
}

// ── Main Component ──

export const SuperAdmin = () => {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [page, setPage] = useState(1);
  const [betaMode, setBeta] = useState(() => getBetaMode());
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

  // Load data
  useEffect(() => {
    try {
      const data = getBusinesses();
      setBusinesses(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    setBusinesses(getBusinesses());
  }, []);

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
      list = list.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          (b.cnpj || '').includes(q)
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

  // Actions
  const handleApprove = useCallback(
    (business: Business) => {
      const now = new Date().toISOString();
      const trialEnds = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      updateBusiness(business.id, {
        status: 'approved',
        approvedAt: now,
        subscriptionStatus: 'trial',
        trialEndsAt: trialEnds,
      });
      refresh();
      setConfirmAction(null);
      setToast({ message: `${business.name} aprovado com sucesso! 🎉`, type: 'success' });
    },
    [refresh]
  );

  const handleReject = useCallback(
    (business: Business, reason: string) => {
      updateBusiness(business.id, { status: 'rejected', rejectionReason: reason });
      refresh();
      setRejectBusiness(null);
      setToast({ message: `${business.name} rejeitado.`, type: 'success' });
    },
    [refresh]
  );

  const handleDelete = useCallback(
    (business: Business) => {
      deleteBusiness(business.id);
      refresh();
      setConfirmAction(null);
      setDetailBusiness(null);
      setToast({ message: `${business.name} excluído permanentemente.`, type: 'success' });
    },
    [refresh]
  );

  const handleBetaToggle = useCallback(() => {
    const next = !betaMode;
    setBeta(next);
    setBetaMode(next);
    setToast({ message: next ? 'Modo Beta ativado 🟡' : 'Modo Produção ativado 🟢', type: 'success' });
  }, [betaMode]);

  // ── Render ──

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
        onConfirm={() => confirmAction && handleApprove(confirmAction.business)}
        onCancel={() => setConfirmAction(null)}
      />
      <ConfirmModal
        open={confirmAction?.type === 'delete'}
        title="🗑️ Excluir Negócio"
        message={`Tem certeza que deseja excluir permanentemente "${confirmAction?.business?.name}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        danger
        onConfirm={() => confirmAction && handleDelete(confirmAction.business)}
        onCancel={() => setConfirmAction(null)}
      />
      <RejectModal
        open={!!rejectBusiness}
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
        <StatsCard label="Total" value={stats.total} color="bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200" />
        <StatsCard label="Pendentes" value={stats.pendentes} color="bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200" />
        <StatsCard label="Aprovados" value={stats.aprovados} color="bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200" />
        <StatsCard label="Rejeitados" value={stats.rejeitados} color="bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200" />
        <StatsCard label="Desabilitados" value={stats.desabilitados} color="bg-gray-100 border-gray-300 text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300" />
        <StatsCard label="Em Trial" value={stats.emTrial} color="bg-purple-50 border-purple-200 text-purple-800 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-200" />
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
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 Buscar por nome ou CNPJ..."
              className="flex-1 p-3 rounded-xl border border-oro-inca/30 bg-white dark:bg-noche-lima text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-aji-rojo"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            {[
              { key: 'todos', label: '📋 Todos' },
              { key: 'pending', label: '⏳ Pendentes' },
              { key: 'approved', label: '✅ Aprovados' },
              { key: 'rejected', label: '❌ Rejeitados' },
              { key: 'disabled', label: '🚫 Desabilitados' },
              { key: 'trial', label: '🧪 Trial' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  statusFilter === tab.key
                    ? 'bg-aji-rojo text-white shadow-md'
                    : 'bg-white dark:bg-noche-lima text-gray-600 dark:text-gray-400 border border-oro-inca/20 hover:border-aji-rojo/50'
                }`}
              >
                {tab.label}
                {tab.key !== 'todos' && (
                  <span className="ml-1.5 opacity-70">
                    (
                    {tab.key === 'trial'
                      ? businesses.filter((b) => b.subscriptionStatus === 'trial').length
                      : businesses.filter((b) => (b.status || 'pending') === tab.key).length}
                    )
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-noche-lima rounded-2xl shadow-lg border border-oro-inca/20 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-oro-inca/20 bg-gray-50 dark:bg-zinc-800/50">
                  <th className="text-left p-4 font-semibold text-noche-lima dark:text-white">Nome</th>
                  <th className="text-left p-4 font-semibold text-noche-lima dark:text-white hidden md:table-cell">Dono</th>
                  <th className="text-left p-4 font-semibold text-noche-lima dark:text-white hidden lg:table-cell">CNPJ</th>
                  <th className="text-left p-4 font-semibold text-noche-lima dark:text-white hidden xl:table-cell">Cidade</th>
                  <th className="text-left p-4 font-semibold text-noche-lima dark:text-white">Status</th>
                  <th className="text-left p-4 font-semibold text-noche-lima dark:text-white hidden sm:table-cell">Data</th>
                  <th className="text-left p-4 font-semibold text-noche-lima dark:text-white">Ações</th>
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
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          onClick={() => setDetailBusiness(biz)}
                          className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 transition-colors"
                          title="Ver detalhes"
                        >
                          👁️
                        </button>
                        {(biz.status || 'pending') !== 'approved' && (
                          <button
                            onClick={() => setConfirmAction({ type: 'approve', business: biz })}
                            className="p-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400 transition-colors"
                            title="Aprovar"
                          >
                            ✅
                          </button>
                        )}
                        {(biz.status || 'pending') !== 'rejected' && (biz.status || 'pending') !== 'disabled' && (
                          <button
                            onClick={() => setRejectBusiness(biz)}
                            className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors"
                            title="Rejeitar"
                          >
                            ❌
                          </button>
                        )}
                        <button
                          onClick={() => setConfirmAction({ type: 'delete', business: biz })}
                          className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors"
                          title="Excluir"
                        >
                          🗑️
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
