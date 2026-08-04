// src/pages/Inbox.tsx
// B2B Chat Inbox — sidebar conversations + WhatsApp-style chat window
// Migrated from localStorage (localData) to API (src/lib/api.ts)

import { useState, useEffect, useRef } from 'react'
import { useUser, useAuth } from '@clerk/clerk-react'
import { MessageList } from '@/components/MessageList'
import { MessageForm } from '@/components/MessageForm'
import {
  getMyBusiness,
  listConversations,
  getConversationMessages,
  sendMessage,
  markMessageRead,
  archiveConversation,
  deleteConversation,
  getBusinessesPublic,
  type RawMessage,
} from '@/lib/api'
import type { B2BMessage } from '@/components/MessageList'

// ─── Type for business options in autocomplete ───
interface BusinessOption {
  id: string
  name: string
}

// UI conversation model derived from backend summaries + message threads
interface Conv {
  id: string // partnerId (backend groups by partner)
  partnerId: string
  partnerName: string
  archived: boolean
  deletedAt: string | null
  unread: number
  lastMessage: string
  lastMessageAt: string
  messages: B2BMessage[]
}

export const Inbox = () => {
  const { user, isLoaded } = useUser()
  const { getToken } = useAuth()

  // ── State ──
  const [conversations, setConversations] = useState<Conv[]>([])
  const [archivedConvs, setArchivedConvs] = useState<Conv[]>([])
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [showMessageForm, setShowMessageForm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [businessId, setBusinessId] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [businessOptions, setBusinessOptions] = useState<BusinessOption[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const CURRENT_BUSINESS_ID = businessId
  const CURRENT_BUSINESS_NAME = businessName || 'Meu Negócio'

  // ── Load current business + autocomplete options on mount ──
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const token = await getToken()
        if (!token) return
        const me = await getMyBusiness(token)
        if (cancelled || !me) return
        setBusinessId(me.id)
        setBusinessName(me.name)
        const list = await getBusinessesPublic(token)
        if (cancelled) return
        setBusinessOptions(
          list
            .filter((b) => b.id !== me.id)
            .map((b) => ({ id: b.id, name: b.name }))
            .sort((a, b) => a.name.localeCompare(b.name))
        )
      } catch (err: any) {
        // 404 = user has no business yet → empty state below
        if (err?.statusCode !== 404) {
          console.error('Erro ao carregar Inbox:', err)
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [getToken])

  // ── Load data once we know the current business ──
  useEffect(() => {
    if (CURRENT_BUSINESS_ID) {
      loadConversations()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [CURRENT_BUSINESS_ID])

  async function loadConversations() {
    if (!CURRENT_BUSINESS_ID) return
    try {
      const token = await getToken()
      if (!token) return
      const summaries = await listConversations(token, CURRENT_BUSINESS_ID)
      const active: Conv[] = []
      const archived: Conv[] = []
      for (const s of summaries) {
        const conv: Conv = {
          id: s.businessId,
          partnerId: s.businessId,
          partnerName: s.businessName,
          archived: s.archived,
          deletedAt: s.deletedAt,
          unread: s.unread || 0,
          lastMessage: s.lastMessage || '',
          lastMessageAt: s.lastMessageAt || '',
          messages: [],
        }
        if (s.archived) archived.push(conv)
        else active.push(conv)
      }
      setConversations(active)
      setArchivedConvs(archived)
    } catch (err) {
      console.error('Erro ao carregar conversas:', err)
    }
  }

  // Selected conversation object
  const selectedConv = selectedConvId
    ? [...conversations, ...archivedConvs].find((c) => c.id === selectedConvId) ?? null
    : null

  // Helper: get the "other" business info
  function otherParticipant(conv: Conv): { id: string; name: string } {
    return { id: conv.partnerId, name: conv.partnerName }
  }

  function unreadCount(conv: Conv): number {
    return conv.messages.filter(
      (m) => m.fromBusinessId !== CURRENT_BUSINESS_ID && !m.read
    ).length
  }

  // ── Load message thread for a conversation (and mark inbound as read) ──
  async function openConversation(convId: string) {
    setSelectedConvId(convId)
    if (!CURRENT_BUSINESS_ID) return
    try {
      const token = await getToken()
      if (!token) return
      const raw = await getConversationMessages(token, CURRENT_BUSINESS_ID, convId)
      const messages: B2BMessage[] = raw.map((m: RawMessage) => ({
        id: m.id,
        fromBusinessId: m.fromBusinessId,
        fromBusinessName:
          m.fromBusinessId === CURRENT_BUSINESS_ID
            ? CURRENT_BUSINESS_NAME
            : m.fromBusiness?.name || m.toBusiness?.name || 'Desconhecido',
        body: m.body,
        createdAt: m.createdAt,
        read: m.read,
      }))
      // Update the conversation's thread in state
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, messages, unread: 0 } : c))
      )
      setArchivedConvs((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, messages, unread: 0 } : c))
      )
      // Mark inbound unread messages as read
      const unreadIds = raw
        .filter((m) => m.toBusinessId === CURRENT_BUSINESS_ID && !m.read)
        .map((m) => m.id)
      if (unreadIds.length > 0) {
        await Promise.all(unreadIds.map((id) => markMessageRead(token, id)))
      }
    } catch (err) {
      console.error('Erro ao carregar mensagens:', err)
    }
  }

  // ── Handlers ──

  async function handleNewMessage(toBusinessId: string, body: string) {
    if (!CURRENT_BUSINESS_ID) return
    try {
      const token = await getToken()
      if (!token) return
      await sendMessage(token, CURRENT_BUSINESS_ID, toBusinessId, body)
      await loadConversations()
      await openConversation(toBusinessId)
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err)
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedConv || !newMessage.trim()) return

    const other = otherParticipant(selectedConv)
    try {
      const token = await getToken()
      if (!token) return
      await sendMessage(token, CURRENT_BUSINESS_ID, other.id, newMessage.trim())
      setNewMessage('')
      await loadConversations()
      await openConversation(other.id)
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err)
    }
  }

  async function handleArchive() {
    if (!selectedConvId || !CURRENT_BUSINESS_ID) return
    try {
      const token = await getToken()
      if (!token) return
      await archiveConversation(token, CURRENT_BUSINESS_ID, selectedConvId, true)
      await loadConversations()
      setSelectedConvId(null)
    } catch (err) {
      console.error('Erro ao arquivar:', err)
    }
  }

  async function handleUnarchive() {
    if (!selectedConvId || !CURRENT_BUSINESS_ID) return
    try {
      const token = await getToken()
      if (!token) return
      await archiveConversation(token, CURRENT_BUSINESS_ID, selectedConvId, false)
      await loadConversations()
      setSelectedConvId(null)
      setShowArchived(false)
    } catch (err) {
      console.error('Erro ao desarquivar:', err)
    }
  }

  async function handleDelete() {
    if (!selectedConvId || !CURRENT_BUSINESS_ID) return
    try {
      const token = await getToken()
      if (!token) return
      await deleteConversation(token, CURRENT_BUSINESS_ID, selectedConvId)
      await loadConversations()
      setSelectedConvId(null)
      setShowDeleteConfirm(false)
    } catch (err) {
      console.error('Erro ao excluir:', err)
    }
  }

  function selectConversation(convId: string) {
    openConversation(convId)
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

  if (!CURRENT_BUSINESS_ID) {
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
                  : conv.lastMessageAt
                  ? new Date(conv.lastMessageAt).toLocaleTimeString('pt-BR', {
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
                              : conv.lastMessage || ''}
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
                    onClick={selectedConv.archived ? handleUnarchive : handleArchive}
                    className="px-3 py-1.5 text-xs rounded-lg border border-oro-inca/30 text-noche-lima dark:text-white hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
                  >
                    {selectedConv.archived ? 'Desarquivar' : 'Arquivar'}
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
