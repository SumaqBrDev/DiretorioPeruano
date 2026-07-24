// src/components/MessageForm.tsx
// Modal overlay for composing a new B2B message with simple autocomplete select

import { useState, useEffect, useMemo, useRef } from 'react'
import { Send, X, ChevronDown } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

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
  const [showDropdown, setShowDropdown] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Filter businesses based on search query
  const filteredBusinesses = useMemo(() => {
    if (!searchQuery) return businesses
    const q = searchQuery.toLowerCase()
    return businesses.filter(
      (b) => b.name.toLowerCase().includes(q) || b.id.toLowerCase().includes(q)
    )
  }, [businesses, searchQuery])

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setSelectedBusinessId('')
      setBody('')
      setSearchQuery('')
      setShowDropdown(false)
      setHighlightedIndex(-1)
    }
  }, [isOpen])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Keyboard navigation
  useEffect(() => {
    if (!showDropdown) return
    function handleKeyDown(e: KeyboardEvent) {
      const max = filteredBusinesses.length - 1
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlightedIndex((i) => (i < max ? i + 1 : 0))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlightedIndex((i) => (i > 0 ? i - 1 : max))
      } else if (e.key === 'Enter' && highlightedIndex >= 0) {
        e.preventDefault()
        selectBusiness(filteredBusinesses[highlightedIndex].id)
      } else if (e.key === 'Escape') {
        setShowDropdown(false)
        setHighlightedIndex(-1)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showDropdown, filteredBusinesses, highlightedIndex])

  const selectBusiness = (id: string) => {
    setSelectedBusinessId(id)
    setSearchQuery(businesses.find((b) => b.id === id)?.name || '')
    setShowDropdown(false)
    setHighlightedIndex(-1)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBusinessId || !body.trim()) return
    onSend(selectedBusinessId, body.trim())
    setSelectedBusinessId('')
    setBody('')
    setSearchQuery('')
    setShowDropdown(false)
    onClose()
  }

  const handleInputClick = () => {
    if (filteredBusinesses.length > 0) setShowDropdown(true)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)
    if (value && filteredBusinesses.length > 0) {
      setShowDropdown(true)
      setHighlightedIndex(0)
    } else {
      setShowDropdown(false)
      setHighlightedIndex(-1)
    }
  }

  const selectedBusiness = businesses.find((b) => b.id === selectedBusinessId)

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
          {/* Destination: Autocomplete select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Para
            </label>
            <div className="relative" ref={dropdownRef}>
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={selectedBusiness ? selectedBusiness.name : searchQuery}
                  onChange={handleInputChange}
                  onClick={handleInputClick}
                  onFocus={handleInputClick}
                  placeholder={selectedBusiness ? '' : 'Selecione ou busque um negócio...'}
                  className={cn(
                    'w-full p-3 rounded-xl border bg-white dark:bg-noche-lima text-gray-700 dark:text-gray-300',
                    'focus:outline-none focus:ring-2 focus:ring-aji-rojo transition-shadow',
                    selectedBusiness
                      ? 'border-green-400 bg-green-50 dark:bg-green-900/20'
                      : 'border-oro-inca/30'
                  )}
                  readOnly={!!selectedBusiness}
                  autoComplete="off"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  {selectedBusiness ? (
                    <span className="text-green-600 dark:text-green-400">✓</span>
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Clear button when selected */}
              {selectedBusiness && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBusinessId('')
                    setSearchQuery('')
                    setShowDropdown(false)
                    inputRef.current?.focus()
                  }}
                  className="absolute right-10 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  aria-label="Limpar seleção"
                >
                  ✕
                </button>
              )}

              {/* Dropdown list */}
              {showDropdown && filteredBusinesses.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-noche-lima rounded-xl border border-oro-inca/30 shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                  {filteredBusinesses.map((biz, idx) => (
                    <button
                      key={biz.id}
                      type="button"
                      onClick={() => selectBusiness(biz.id)}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      className={cn(
                        'w-full px-3 py-2.5 text-left text-sm transition-colors',
                        highlightedIndex === idx
                          ? 'bg-aji-rojo/10 text-aji-rojo'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800'
                      )}
                    >
                      {biz.name}
                      <span className="ml-2 text-xs text-gray-400">({biz.id})</span>
                    </button>
                  ))}
                </div>
              )}

              {showDropdown && filteredBusinesses.length === 0 && searchQuery && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-noche-lima rounded-xl border border-oro-inca/30 shadow-xl p-3 text-center text-sm text-gray-500 dark:text-gray-400">
                  Nenhum negócio encontrado
                </div>
              )}
            </div>
            {!selectedBusiness && searchQuery && filteredBusinesses.length === 0 && (
              <p className="mt-1.5 text-sm text-red-500">Nenhum negócio encontrado</p>
            )}
          </div>

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