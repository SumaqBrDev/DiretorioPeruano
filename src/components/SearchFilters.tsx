// src/components/SearchFilters.tsx
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'

export const SearchFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams()

  const filters = {
    category: searchParams.get('category') || '',
    city: searchParams.get('city') || '',
    rating: searchParams.get('rating') || '',
    tag: searchParams.get('tag') || '',
  }

  const updateFilter = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams)
    if (value) {
      newParams.set(key, value)
    } else {
      newParams.delete(key)
    }
    setSearchParams(newParams)
  }

  const clearFilters = () => {
    setSearchParams({})
  }

  const hasActiveFilters = Object.values(filters).some(v => v)

  const categories = [
    { value: 'restaurante', label: 'Restaurantes' },
    { value: 'mercado', label: 'Mercados' },
    { value: 'cafe', label: 'Cafés' },
    { value: 'servicos', label: 'Serviços' },
  ]

  const cities = [
    { value: 'sao-paulo', label: 'São Paulo - SP' },
    { value: 'rio-de-janeiro', label: 'Rio de Janeiro - RJ' },
    { value: 'brasilia', label: 'Brasília - DF' },
    { value: 'curitiba', label: 'Curitiba - PR' },
    { value: 'belo-horizonte', label: 'Belo Horizonte - MG' },
    { value: 'porto-alegre', label: 'Porto Alegre - RS' },
  ]

  const ratings = [
    { value: '4.5', label: '4.5+ estrelas' },
    { value: '4.0', label: '4.0+ estrelas' },
    { value: '3.5', label: '3.5+ estrelas' },
  ]

  return (
    <aside className="sticky top-20 space-y-6">
      <div className="bg-white dark:bg-noche-lima rounded-2xl shadow-lg p-6 border border-oro-inca/20 space-y-6">
        <h3 className="font-playfair text-xl font-bold text-noche-lima dark:text-white mb-4">Filtros</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Categoria</label>
            <select
              value={searchParams.get('category') || ''}
              onChange={(e) => {
                const newParams = new URLSearchParams(window.location.search)
                if (e.target.value) {
                  newParams.set('category', e.target.value)
                } else {
                  newParams.delete('category')
                }
                window.history.pushState({}, '', `/busca?${newParams.toString()}`)
              }}
              className="w-full p-3 rounded-lg border border-oro-inca/30 bg-white dark:bg-noche-lima text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-aji-rojo"
            >
              <option value="">Todas as categorias</option>
              <option value="restaurante">Restaurantes</option>
              <option value="mercado">Mercados</option>
              <option value="cafe">Cafés</option>
              <option value="servicos">Serviços</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cidade</label>
            <select
              value={new URLSearchParams(window.location.search).get('city') || ''}
              onChange={(e) => {
                const newParams = new URLSearchParams(window.location.search)
                if (e.target.value) {
                  newParams.set('city', e.target.value)
                } else {
                  newParams.delete('city')
                }
                window.history.pushState({}, '', `/busca?${newParams.toString()}`)
              }}
              className="w-full p-3 rounded-lg border border-oro-inca/30 bg-white dark:bg-noche-lima text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-aji-rojo"
            >
              <option value="">Todas as cidades</option>
              <option value="sao-paulo">São Paulo - SP</option>
              <option value="rio-de-janeiro">Rio de Janeiro - RJ</option>
              <option value="brasilia">Brasília - DF</option>
              <option value="curitiba">Curitiba - PR</option>
              <option value="belo-horizonte">Belo Horizonte - MG</option>
              <option value="porto-alegre">Porto Alegre - RS</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Avaliação mínima</label>
            <select
              value={new URLSearchParams(window.location.search).get('rating') || ''}
              onChange={(e) => {
                const newParams = new URLSearchParams(window.location.search)
                if (e.target.value) {
                  newParams.set('rating', e.target.value)
                } else {
                  newParams.delete('rating')
                }
                window.history.pushState({}, '', `/busca?${newParams.toString()}`)
              }}
              className="w-full p-3 rounded-lg border border-oro-inca/30 bg-white dark:bg-noche-lima text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-aji-rojo"
            >
              <option value="">Qualquer avaliação</option>
              <option value="4.5">4.5+ estrelas</option>
              <option value="4.0">4.0+ estrelas</option>
              <option value="3.5">3.5+ estrelas</option>
            </select>
          </div>
        </div>
      </div>
    </aside>
  )
}