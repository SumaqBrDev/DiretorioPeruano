// src/components/MessageList.tsx
// WhatsApp-style chat bubbles with auto-scroll

import { useEffect, useRef } from 'react'

export interface B2BMessage {
  id: string
  fromBusinessId: string
  fromBusinessName: string
  body: string
  createdAt: string
  read: boolean
}

interface MessageListProps {
  messages: B2BMessage[]
  currentBusinessId: string
}

export const MessageList = ({ messages, currentBusinessId }: MessageListProps) => {
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to newest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <p className="text-lg font-medium">Nenhuma mensagem ainda</p>
          <p className="text-sm mt-1">Envie sua primeira mensagem!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-4 min-h-full justify-end">
      {messages.length > 0 && (
        <div className="flex-1" />
      )}

      {messages.map((msg) => {
        const isOwn = msg.fromBusinessId === currentBusinessId
        const time = new Date(msg.createdAt).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        })
        const displayName = isOwn ? 'Você' : msg.fromBusinessName
        const initial = displayName.charAt(0).toUpperCase()

        return (
          <div
            key={msg.id}
            className={`flex items-end gap-2 ${
              isOwn ? 'justify-end' : 'justify-start'
            }`}
          >
            {/* Avatar — only for received messages */}
            {!isOwn && (
              <div className="w-8 h-8 rounded-full bg-oro-inca/20 dark:bg-oro-inca/30 flex items-center justify-center text-xs font-bold text-oro-inca flex-shrink-0">
                {initial}
              </div>
            )}

            {/* Bubble */}
            <div className="max-w-[75%] min-w-[60px]">
              <div
                className={`px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                  isOwn
                    ? 'bg-aji-rojo text-white rounded-2xl rounded-br-sm'
                    : 'bg-gray-100 dark:bg-zinc-700 text-gray-900 dark:text-gray-100 rounded-2xl rounded-bl-sm'
                }`}
              >
                {msg.body}
              </div>
              <p
                className={`text-[10px] mt-0.5 text-gray-400 ${
                  isOwn ? 'text-right' : 'text-left'
                }`}
              >
                {time}
              </p>
            </div>

            {/* Avatar — only for own messages */}
            {isOwn && (
              <div className="w-8 h-8 rounded-full bg-aji-rojo/20 dark:bg-aji-rojo/30 flex items-center justify-center text-xs font-bold text-aji-rojo flex-shrink-0">
                {initial}
              </div>
            )}
          </div>
        )
      })}

      {/* Invisible anchor for auto-scroll */}
      <div ref={bottomRef} />
    </div>
  )
}
