// src/components/MessageForm.tsx
// Modal overlay for composing a new B2B message with autocomplete

import { useState, useRef, useEffect } from 'react'

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
  const [toBusinessId, setToBusinessId] = useState('')
  const [body, setBody] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Filter businesses based on search query
  const filteredBusinesses = businesses.filter((b) =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false)
        setHighlightedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setToBusinessId('')
      setBody('')
      setSearchQuery('')
      setShowDropdown(false)
      setHighlightedIndex(-1)
    }
  }, [isOpen])

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!toBusinessId || !body.trim()) return
    onSend(toBusinessId, body.trim())
    setToBusinessId('')
    setBody('')
    setSearchQuery('')
    setShowDropdown(false)
    onClose()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)
    setShowDropdown(true)
    setHighlightedIndex(-1)
    // If exact match, select it
    const match = businesses.find(b => b.name.toLowerCase() === value.toLowerCase())
    if (match) {
      setToBusinessId(match.id)
    }
  }

  const handleInputFocus = () => {
    if (searchQuery || !toBusinessId) {
      setShowDropdown(true)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || filteredBusinesses.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev => Math.min(prev + 1, filteredBusinesses.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => Math.max(prev - 1, -1))
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && filteredBusinesses[highlightedIndex]) {
          selectBusiness(filteredBusinesses[highlightedIndex])
        }
        break
      case 'Escape':
        setShowDropdown(false)
        setHighlightedIndex(-1)
        inputRef.current?.blur()
        break
    }
  }

  const selectBusiness = (business: BusinessOption) => {
    setToBusinessId(business.id)
    setSearchQuery(business.name)
    setShowDropdown(false)
    setHighlightedIndex(-1)
  }

  const handleOptionClick = (business: BusinessOption) => {
    selectBusiness(business)
  }

  const handleOptionMouseEnter = (index: number) => {
    setHighlightedIndex(index)
  }

  const clearSelection = () => {
    setToBusinessId('')
    setSearchQuery('')
    setShowDropdown(false)
  }

  if (!isOpen) return null

  const displayedName = businesses.find(b => b.id === toBusinessId)?.name || searchQuery

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
          {/* Destination combobox with autocomplete */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Para
            </label>
            <div className="relative">
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={displayedName}
                  onChange={handleInputChange}
                  onFocus={handleInputFocus}
                  onKeyDown={handleKeyDown}
                  placeholder="Digite para buscar um negócio..."
                  className="w-full p-3 rounded-xl border border-oro-inca/30 bg-white dark:bg-noche-lima text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-aji-rojo transition-shadow pr-10"
                  autoComplete="off"
                  required
                />
                {toBusinessId && (
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    aria-label="Limpar seleção"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Dropdown */}
              {showDropdown && filteredBusinesses.length > 0 && (
                <div
                  ref={dropdownRef}
                  className="absolute z-10 w-full mt-1 bg-white dark:bg-noche-lima rounded-xl border border-oro-inca/30 shadow-lg overflow-hidden max-h-60 overflow-y-auto"
                >
                  {filteredBusinesses.map((business, index) => (
                    <button
                      key={business.id}
                      type="button"
                      onClick={() => handleOptionClick(business)}
                      onMouseEnter={() => handleOptionMouseEnter(index)}
                      className={`w-full text-left px-4 py-3 transition-colors ${
                        index === highlightedIndex
                          ? 'bg-aji-rojo/10 dark:bg-aji-rojo/20 text-aji-rojo'
                          : 'hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <span className="font-medium">{business.name}</span>
                      <span className="text-xs text-gray-400 ml-2 font-mono">({business.id})</span>
                    </button>
                  ))}
                </div>
              )}

              {showDropdown && filteredBusinesses.length === 0 && searchQuery && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-noche-lima rounded-xl border border-oro-inca/30 shadow-lg p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                  Nenhum negócio encontrado para "{searchQuery}"
                </div>
              )}
            </div>
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