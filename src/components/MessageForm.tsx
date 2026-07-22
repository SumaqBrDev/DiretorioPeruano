// src/components/MessageForm.tsx
// Modal overlay for composing a new B2B message

import { useState } from 'react'

interface MessageFormProps {
  isOpen: boolean
  onClose: () => void
  onSend: (toBusinessId: string, body: string) => void
}

const MOCK_BUSINESSES = [
  { id: 'biz-2', name: 'Lima Criolla' },
  { id: 'biz-3', name: 'Ceviche House SP' },
  { id: 'biz-4', name: 'Andina Grill' },
  { id: 'biz-5', name: 'Pisco Bar' },
]

export const MessageForm = ({ isOpen, onClose, onSend }: MessageFormProps) => {
  const [toBusinessId, setToBusinessId] = useState('')
  const [body, setBody] = useState('')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!toBusinessId || !body.trim()) return
    onSend(toBusinessId, body.trim())
    setToBusinessId('')
    setBody('')
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-noche-lima rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-playfair text-2xl font-bold text-aji-rojo mb-6">
          Nova Mensagem
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Destination select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Para
            </label>
            <select
              value={toBusinessId}
              onChange={(e) => setToBusinessId(e.target.value)}
              className="w-full p-3 rounded-xl border border-oro-inca/30 bg-white dark:bg-noche-lima text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-aji-rojo transition-shadow"
              required
            >
              <option value="">Selecione um negócio</option>
              {MOCK_BUSINESSES.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Message textarea */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Mensagem
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              className="w-full p-3 rounded-xl border border-oro-inca/30 bg-white dark:bg-noche-lima text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-aji-rojo transition-shadow resize-none"
              placeholder="Escreva sua mensagem..."
              required
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-oro-inca/30 text-noche-lima dark:text-white font-semibold hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!toBusinessId || !body.trim()}
              className="flex-1 py-3 rounded-xl bg-aji-rojo text-white font-semibold hover:bg-aji-rojo/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Enviar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
