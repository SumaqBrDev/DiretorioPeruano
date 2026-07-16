// src/pages/Inbox.tsx
import { useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import { MessageList } from '@/components/MessageList'
import { MessageForm } from '@/components/MessageForm'

// Mock messages for the inbox
const mockMessages = [
  {
    id: 'msg_1',
    fromBusiness: { id: 'business-2', name: 'Lima Criolla' },
    toBusiness: { id: 'business-1', name: 'Sabores do Peru' },
    body: 'Olá! Gostaria de saber se vocês têm interesse em uma parceria para fornecer ingredientes peruanos.',
    read: true,
    createdAt: '2025-01-15T10:30:00Z',
    fromBusinessId: 'business-2',
    toBusinessId: 'business-1'
  },
  {
    id: 'msg_2',
    fromBusiness: { id: 'business-1', name: 'Sabores do Peru' },
    toBusiness: { id: 'business-2', name: 'Lima Criolla' },
    body: 'Sim, temos interesse! Quais ingredientes vocês precisam? Temos ají amarillo, ají panca, rocoto fresco...',
    read: false,
    createdAt: '2025-01-15T11:15:00Z',
    fromBusinessId: 'business-1',
    toBusinessId: 'business-2'
  },
  {
    id: 'msg_3',
    fromBusiness: { id: 'business-3', name: 'Ceviche House SP' },
    toBusiness: { id: 'business-1', name: 'Sabores do Peru' },
    body: 'Vocês fazem delivery para a zona sul de SP? Gostaria de pedir uns ceviches para um evento.',
    read: false,
    createdAt: '2025-01-14T16:45:00Z',
    fromBusinessId: 'business-3',
    toBusinessId: 'business-1'
  }
]

export const Inbox = () => {
  const { user, isLoaded } = useUser()
  const [messages, setMessages] = useState(mockMessages)
  const [selectedConversation, setSelectedConversation] = useState<string | null>('business-2')

  if (!isLoaded) {
    return <div className="container mx-auto px-4 py-8 text-center">Carregando...</div>
  }

  if (!user) {
    return <div className="container mx-auto px-4 py-8 text-center">Não autenticado</div>
  }

  // Use first business as current for demo
  const currentBusinessId = 'business-1'
  const currentBusinessName = 'Sabores do Peru'

  // Filter messages for selected conversation
  const conversationMessages = messages.filter(
    m => (m.fromBusinessId === currentBusinessId && m.toBusinessId === selectedConversation) ||
         (m.fromBusinessId === selectedConversation && m.toBusinessId === currentBusinessId)
  )

  const handleSendMessage = (toBusinessId: string, body: string) => {
    const newMessage = {
      id: `msg_${Date.now()}`,
      fromBusiness: { id: currentBusinessId, name: currentBusinessName },
      toBusiness: { id: toBusinessId, name: '' },
      body,
      read: false,
      createdAt: new Date().toISOString(),
      fromBusinessId: currentBusinessId,
      toBusinessId
    }
    setMessages(prev => [...prev, newMessage])
    setSelectedConversation(toBusinessId)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="font-playfair text-3xl font-bold text-aji-rojo mb-8">Inbox B2B</h1>
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-noche-lima rounded-2xl shadow-lg border border-oro-inca/20 p-6 h-full">
            <h2 className="font-playfair text-xl font-bold text-noche-lima dark:text-white mb-4">
              {selectedConversation ? 
                mockMessages.find(m => 
                  (m.fromBusinessId === currentBusinessId && m.toBusinessId === selectedConversation) ||
                  (m.fromBusinessId === selectedConversation && m.toBusinessId === currentBusinessId)
                )?.fromBusiness?.name || 'Conversa' 
                : 'Selecione uma conversa'}
            </h2>
            <div className="h-[500px] overflow-y-auto">
              <MessageList 
                messages={conversationMessages} 
                currentBusinessId={currentBusinessId} 
              />
            </div>
          </div>
        </div>
        <div>
          <div className="bg-white dark:bg-noche-lima rounded-2xl shadow-lg border border-oro-inca/20 p-6 mb-6">
            <h3 className="font-playfair text-lg font-bold text-noche-lima dark:text-white mb-4">Conversas</h3>
            <div className="space-y-2">
              {['business-2', 'business-3'].map(bizId => {
                const lastMsg = messages
                  .filter(m => 
                    (m.fromBusinessId === currentBusinessId && m.toBusinessId === bizId) ||
                    (m.fromBusinessId === bizId && m.toBusinessId === currentBusinessId)
                  )
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
                const businessName = lastMsg?.fromBusinessId === bizId ? lastMsg.fromBusiness.name : lastMsg?.toBusiness.name
                return (
                  <button
                    key={bizId}
                    onClick={() => setSelectedConversation(bizId)}
                    className={`w-full text-left p-3 rounded-xl transition-colors ${
                      selectedConversation === bizId
                        ? 'bg-aji-rojo/10 border border-aji-rojo/30'
                        : 'hover:bg-oro-inca/10'
                    }`}
                  >
                    <p className="font-medium text-noche-lima dark:text-white">{businessName}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {lastMsg?.body.substring(0, 50)}...
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {lastMsg ? new Date(lastMsg.createdAt).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'}) : ''}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>
          <MessageForm 
            currentBusinessId={currentBusinessId} 
            onSendMessage={handleSendMessage} 
          />
        </div>
      </div>
    </div>
  )
}