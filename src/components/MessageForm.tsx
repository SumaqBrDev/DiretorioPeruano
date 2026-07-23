// src/components/MessageForm.tsx
// Modal overlay for composing a new B2B message with shadcn combobox + autocomplete

import { useState, useEffect } from 'react'
import { Check, ChevronsUpDown, Send, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
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
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const [body, setBody] = useState('')

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setValue('')
      setBody('')
      setOpen(false)
    }
  }, [isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!value || !body.trim()) return
    onSend(value, body.trim())
    setValue('')
    setBody('')
    onClose()
  }

  const selected = businesses.find((b) => b.id === value)

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
          {/* Destination: shadcn combobox */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Para
            </label>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full justify-between border-oro-inca/30 text-left font-normal"
                >
                  {selected
                    ? selected.name
                    : 'Selecione um negócio...'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar negócio..." />
                  <CommandList>
                    <CommandEmpty>Nenhum negócio encontrado.</CommandEmpty>
                    <CommandGroup>
                      {businesses.map((business) => (
                        <CommandItem
                          key={business.id}
                          value={business.name}
                          onSelect={(currentValue) => {
                            const biz = businesses.find(
                              (b) => b.name.toLowerCase() === currentValue.toLowerCase()
                            )
                            if (biz) {
                              setValue(biz.id === value ? '' : biz.id)
                            }
                            setOpen(false)
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              value === business.id ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          {business.name}
                          <span className="ml-2 text-xs text-gray-400">
                            ({business.id})
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
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
              disabled={!value || !body.trim()}
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