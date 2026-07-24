import * as React from 'react'
import { cn } from '@/lib/utils'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={cn(
            'w-full px-3 py-2.5 rounded-xl border bg-white dark:bg-noche-lima text-gray-700 dark:text-gray-300',
            'focus:outline-none focus:ring-2 focus:ring-aji-rojo focus:border-transparent',
            'disabled:opacity-50 disabled:cursor-not-allowed resize-none',
            error && 'border-red-400 focus:ring-red-500',
            !error && 'border-oro-inca/30',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1.5 text-sm text-red-500">{error}</p>}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'