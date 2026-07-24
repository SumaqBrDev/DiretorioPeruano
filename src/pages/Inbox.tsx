// src/pages/Inbox.tsx
// B2B Chat Inbox — sidebar conversations + WhatsApp-style chat window

import { useState, useEffect, useRef, useMemo } from 'react'
import { useUser } from '@clerk/clerk-react'
import { MessageList } from '@/components/MessageList'
import { MessageForm } from '@/components/MessageForm'
import {
  getB2BConversations,
  getB2BArchivedConversations,
  saveB2BMessage,
  toggleArchiveB2B,
  softDeleteB2B,
  getBusinesses,
} from '@/lib/localData'
import type { B2BConversation, Business } from '@/lib/localData'

// ─── Type for business options in autocomplete ───
interface BusinessOption {
  id: string
  name: string
}

export const Inbox = () => {
  const { user, isLoaded } = useUser()

  // ── State ──
  const [conversations, setConversations] = useState<B2BConversation[]>([])
  const [archivedConvs, setArchivedConvs] = useState<B2BConversation[]>([])
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [showMessageForm, setShowMessageForm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // ── Find current user's business from localStorage ──
  const currentBusiness = useMemo<Business | null>(() => {
    if (!user) return null
    const businesses = getBusinesses()
    // Match by userId (the Clerk user owns businesses via Onboarding)
    return businesses.find(b => b.userId === user.id) || null
  }, [user])

  const CURRENT_BUSINESS_ID = currentBusiness?.id || ''
  const CURRENT_BUSINESS_NAME = currentBusiness?.name || 'Meu Negócio'

  // ── Derive business list for autocomplete ──
  const businessOptions: BusinessOption[] = useMemo(() => {
    if (!CURRENT_BUSINESS_ID) return []
    return getBusinesses()
      .filter((b) => b.id !== CURRENT_BUSINESS_ID && (b.status === 'approved' || b.status === 'pending' || !b.status))
      .map((b) => ({ id: b.id, name: b.name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [CURRENT_BUSINESS_ID])

  // ── Load data on mount ──
  useEffect(() => {
    if (CURRENT_BUSINESS_ID) {
      loadConversations()
    }
  }, [CURRENT_BUSINESS_ID])

  function loadConversations() {
    if (!CURRENT_BUSINESS_ID) return
    setConversations(getB2BConversations(CURRENT_BUSINESS_ID))
    setArchivedConvs(getB2BArchivedConversations(CURRENT_BUSINESS_ID))
  }

  // Selected conversation object
  const selectedConv = selectedConvId
    ? [...conversations, ...archivedConvs].find((c) => c.id === selectedConvId) ?? null
    : null

  // Helper: get the "other" business info
  function otherParticipant(conv: B2BConversation): { id: string; name: string } {
    const idx = conv.participantIds[0] === CURRENT_BUSINESS_ID ? 1 : 0
    return { id: conv.participantIds[idx], name: conv.participantNames[idx] }
  }

  function unreadCount(conv: B2BConversation): number {
    return conv.messages.filter(
      (m) => m.fromBusinessId !== CURRENT_BUSINESS_ID && !m.read
    ).length
  }

  // ── Handlers ──

  function handleNewMessage(toBusinessId: string, body: string) {
    const other = getBusinesses().find(b => b.id === toBusinessId)
    const otherName = other?.name || toBusinessId
    saveB2BMessage(CURRENT_BUSINESS_ID, CURRENT_BUSINESS_NAME, toBusinessId, otherName, body)
    loadConversations()
    setSelectedConvId([CURRENT_BUSINESS_ID, toBusinessId].sort().join('_'))
  }

  function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedConv || !newMessage.trim()) return

    const other = otherParticipant(selectedConv)
    saveB2BMessage(CURRENT_BUSINESS_ID, CURRENT_BUSINESS_NAME, other.id, other.name, newMessage.trim())
    setNewMessage('')
    loadConversations()
  }

  function handleArchive() {
    if (!selectedConvId) return
    toggleArchiveB2B(selectedConvId, CURRENT_BUSINESS_ID)
    loadConversations()
    setSelectedConvId(null)
  }

  function handleDelete() {
    if (!selectedConvId) return
    softDeleteB2B(selectedConvId, CURRENT_BUSINESS_ID)
    loadConversations()
    setSelectedConvId(null)
    setShowDeleteConfirm(false)
  }

  function selectConversation(convId: string) {
    setSelectedConvId(convId)
  }

  // ── Loading / Auth guards ──
  if (!isLoaded) {
    return (
      <div className="container mx-auto px-4 py-8 text-center text-noche-lima dark:text-white">
        Carregando...
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 text-center text-noche-lima dark:text-white">
        Não autenticado
      </div>
    )
  }

  if (!currentBusiness) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h2 className="font-playfair text-2xl font-bold text-aji-rojo mb-4">Nenhum negócio encontrado</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          Você precisa cadastrar um negócio antes de usar o Inbox.
        </p>
        <a
          href="/onboarding"
          className="inline-flex items-center gap-2 bg-aji-rojo text-white px-6 py-3 rounded-xl font-semibold hover:bg-aji-rojo/90 transition-all"
        >
          Cadastrar Negócio →
        </a>
      </div>
    )
  }

  // Display list
  const displayConvs = showArchived ? archivedConvs : conversations

  return (
    <div className="container mx-auto px-4 py-6 md:py-8 max-w-6xl">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-playfair text-2xl md:text-3xl font-bold text-aji-rojo">
          Inbox B2B
        </h1>
        <button
          onClick={() => setShowMessageForm(true)}
          className="bg-aji-rojo text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-aji-rojo/90 transition-colors text-sm md:text-base shadow-sm"
        >
          + Novo Mensagem
        </button>
      </div>

      {/* ── Main chat layout ── */}
      <div className="flex rounded-2xl shadow-lg border border-oro-inca/20 overflow-hidden bg-white dark:bg-noche-lima h-[calc(100vh-220px)] min-h-[500px]">
        {/* ═══ Sidebar — Conversation list ═══ */}
        <div className="w-[280px] md:w-1/3 min-w-[220px] border-r border-oro-inca/20 flex flex-col">
          {/* Sidebar header */}
          <div className="p-4 border-b border-oro-inca/20">
            <h2 className="font-semibold text-noche-lima dark:text-white text-sm uppercase tracking-wide">
              {showArchived ? 'Arquivados' : 'Conversas'}
            </h2>
          </div>

          {/* Conversation items */}
          <div className="flex-1 overflow-y-auto">
            {displayConvs.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
                {showArchived
                  ? 'Nenhuma conversa arquivada'
                  : 'Nenhuma conversa ativa'}
              </div>
            ) : (
              displayConvs.map((conv) => {
                const other = otherParticipant(conv)
                const lastMsg = conv.messages[conv.messages.length - 1]
                const unread = unreadCount(conv)
                const time = lastMsg
                  ? new Date(lastMsg.createdAt).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : ''

                return (
                  <button
                    key={conv.id}
                    onClick={() => selectConversation(conv.id)}
                    className={`w-full text-left p-3.5 transition-colors border-b border-oro-inca/5 ${
                      selectedConvId === conv.id
                        ? 'bg-aji-rojo/10 dark:bg-aji-rojo/20'
                        : 'hover:bg-gray-50 dark:hover:bg-zinc-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-oro-inca/20 dark:bg-oro-inca/30 flex items-center justify-center text-sm font-bold text-oro-inca flex-shrink-0">
                        {other.name.charAt(0).toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <span
                            className={`font-medium text-sm truncate ${
                              unread > 0
                                ? 'text-noche-lima dark:text-white font-bold'
                                : 'text-noche-lima dark:text-white'
                            }`}
                          >
                            {other.name}
                          </span>
                          <span className="text-[10px] text-gray-400 ml-1 whitespace-nowrap">
                            {time}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {unread > 0 && (
                            <span className="bg-aji-rojo text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                              {unread}
                            </span>
                          )}
                          <p
                            className={`text-xs truncate ${
                              unread > 0
                                ? 'text-gray-700 dark:text-gray-300 font-medium'
                                : 'text-gray-500 dark:text-gray-400'
                            }`}
                          >
                            {lastMsg
                              ? lastMsg.body.length > 50
                                ? lastMsg.body.slice(0, 50) + '…'
                                : lastMsg.body
                              : ''}
                          </p>
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {/* Archived / Back toggle */}
          {!showArchived && archivedConvs.length > 0 && (
            <button
              onClick={() => setShowArchived(true)}
              className="p-3 border-t border-oro-inca/20 text-sm text-aji-rojo font-medium hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
            >
              Arquivados ({archivedConvs.length})
            </button>
          )}
          {showArchived && (
            <button
              onClick={() => setShowArchived(false)}
              className="p-3 border-t border-oro-inca/20 text-sm text-aji-rojo font-medium hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
            >
              ← Voltar para Conversas
            </button>
          )}
        </div>

        {/* ═══ Chat panel ═══ */}
        <div className="flex-1 flex flex-col">
          {selectedConv ? (
            <>
              {/* ─── Chat header ─── */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-oro-inca/20 bg-white dark:bg-noche-lima">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-oro-inca/20 dark:bg-oro-inca/30 flex items-center justify-center text-sm font-bold text-oro-inca flex-shrink-0">
                    {otherParticipant(selectedConv).name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-noche-lima dark:text-white text-sm">
                      {otherParticipant(selectedConv).name}
                    </h3>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      {selectedConv.messages.length} mensagens
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleArchive}
                    className="px-3 py-1.5 text-xs rounded-lg border border-oro-inca/30 text-noche-lima dark:text-white hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
                  >
                    {selectedConv.archivedBy.includes(CURRENT_BUSINESS_ID)
                      ? 'Desarquivar'
                      : 'Arquivar'}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-3 py-1.5 text-xs rounded-lg border border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    Excluir
                  </button>
                </div>
              </div>

              {/* ─── Messages ─── */}
              <div className="flex-1 overflow-y-auto bg-gray-50/50 dark:bg-black/10">
                <MessageList
                  messages={selectedConv.messages}
                  currentBusinessId={CURRENT_BUSINESS_ID}
                />
              </div>

              {/* ─── Input bar ─── */}
              <div className="px-4 py-3 border-t border-oro-inca/20 bg-white dark:bg-noche-lima">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    className="flex-1 p-3 rounded-xl border border-oro-inca/30 bg-gray-50 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-aji-rojo transition-shadow text-sm"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="px-5 py-3 bg-aji-rojo text-white rounded-xl font-semibold hover:bg-aji-rojo/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    Enviar
                  </button>
                </form>
              </div>
            </>
          ) : (
            /* ─── Empty state ─── */
            <div className="flex-1 flex items-center justify-center bg-gray-50/50 dark:bg-black/10">
              <div className="text-center text-gray-500 dark:text-gray-400 px-6">
                <div className="text-5xl mb-4">💬</div>
                <p className="text-lg font-medium">Nenhuma conversa selecionada</p>
                <p className="text-sm mt-1">
                  Selecione uma conversa ao lado ou clique em "Novo Mensagem"
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── New message modal ── */}
      {showMessageForm && (
        <MessageForm
          isOpen={showMessageForm}
          onClose={() => setShowMessageForm(false)}
          onSend={handleNewMessage}
          businesses={businessOptions}
        />
      )}

      {/* ── Delete confirmation modal ── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white dark:bg-noche-lima rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <h3 className="font-bold text-lg text-noche-lima dark:text-white mb-2">
              Excluir conversa
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
              Tem certeza que deseja excluir esta conversa?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-oro-inca/30 text-noche-lima dark:text-white font-medium hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}