// src/components/MessageForm.tsx
// Modal overlay for composing a new B2B message with simple native select

import { useState, useEffect, useMemo } from 'react'
import { Send, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

interface BusinessOption {
  id: string
  name: string
}

interface MessageFormProps {
  isOpen: boolean
  onClose: () => void
  onSend: (toBusinessId: string, body: string) => void
  businesses: BusinessOption[]
}

export const MessageForm = ({ isOpen, onClose, onSend, businesses }: MessageFormProps) => {
  const [selectedBusinessId, setSelectedBusinessId] = useState('')
  const [body, setBody] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Filter businesses based on search query
  const filteredBusinesses = useMemo(() => {
    if (!searchQuery) return businesses
    const q = searchQuery.toLowerCase()
    return businesses.filter(
      (b) => b.name.toLowerCase().includes(q) || b.id.toLowerCase().includes(q)
    )
  }, [businesses, searchQuery])

  // Options for select
  const selectOptions = useMemo(() => 
    filteredBusinesses.map((b) => ({ value: b.id, label: b.name }))
  , [filteredBusinesses])

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setSelectedBusinessId('')
      setBody('')
      setSearchQuery('')
    }
  }, [isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBusinessId || !body.trim()) return
    onSend(selectedBusinessId, body.trim())
    setSelectedBusinessId('')
    setBody('')
    setSearchQuery('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-noche-lima rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-playfair text-2xl font-bold text-aji-rojo">
            Nova Mensagem
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Search input for filtering businesses */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Buscar negócio
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Digite para filtrar..."
              className="w-full p-3 rounded-xl border border-oro-inca/30 bg-white dark:bg-noche-lima text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-aji-rojo transition-shadow"
            />
          </div>

          {/* Destination: Simple native select */}
          <Select
            label="Para"
            placeholder="Selecione um negócio..."
            value={selectedBusinessId}
            onChange={(e) => setSelectedBusinessId(e.target.value)}
            options={selectOptions}
            error={!selectedBusinessId && searchQuery ? 'Nenhum negócio encontrado' : undefined}
          />

          {/* Message textarea */}
          <Textarea
            label="Mensagem"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            placeholder="Escreva sua mensagem..."
            required
          />

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!selectedBusinessId || !body.trim()}
              className="flex-1 bg-aji-rojo hover:bg-aji-rojo/90 text-white"
            >
              <Send className="mr-2 h-4 w-4" />
              Enviar
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}