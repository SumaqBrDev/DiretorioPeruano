// src/scripts/cleanup.ts
// Script para limpiar todos los datos de prueba y dejar el site listo para producción
// Ejecutar: npm run cleanup

/**
 * ¿Qué hace este script?
 *
 * 1. Limpia TODOS los datos de localStorage (negocios, reseñas, conversaciones, etc.)
 * 2. Elimina el item que marca que ya se ejecutó el seed
 *
 * ¿Cuándo ejecutarlo?
 * - Antes de poner el site en producción
 * - Cuando quieras empezar con datos frescos desde cero
 *
 * ¿Cómo ejecutarlo?
 *   npm run cleanup
 *
 * O manualmente desde la consola del navegador:
 *   localStorage.clear()
 *
 * ⚠️ Advertencia: Esta acción es irreversible. Los datos de prueba se perderán.
 */

const STORAGE_KEYS = [
  'diretorio_peruano_businesses',
  'diretorio_peruano_reviews',
  'diretorio_peruano_conversations',
  'direto…_b2b',
  'diretorio_beta_mode',
]

// Versionar el schema por si en el futuro cambia la estructura
const SCHEMA_VERSION_KEY = 'diretorio_peruano_schema_version'
const CURRENT_SCHEMA_VERSION = '2.0.0' // Post-mock removal

export function isClean(): boolean {
  return STORAGE_KEYS.every(key => {
    try {
      return !localStorage.getItem(key)
    } catch {
      return true
    }
  })
}

export function getStorageStats(): Record<string, number> {
  const stats: Record<string, number> = {}
  STORAGE_KEYS.forEach(key => {
    try {
      const data = localStorage.getItem(key)
      if (data) {
        try {
          const parsed = JSON.parse(data)
          stats[key] = Array.isArray(parsed) ? parsed.length : 1
        } catch {
          stats[key] = data.length
        }
      } else {
        stats[key] = 0
      }
    } catch {
      stats[key] = -1 // Error reading
    }
  })
  return stats
}

export function clearAllData(): void {
  console.log('=== Cleaning up test data ===')

  const before = getStorageStats()
  console.log('Before:', JSON.stringify(before, null, 2))

  STORAGE_KEYS.forEach(key => {
    try {
      localStorage.removeItem(key)
      console.log(`  ✅ Removed: ${key}`)
    } catch (err) {
      console.error(`  ❌ Error removing ${key}:`, err)
    }
  })

  // Set schema version marker for fresh start
  try {
    localStorage.setItem(SCHEMA_VERSION_KEY, CURRENT_SCHEMA_VERSION)
  } catch {
    // ignore storage errors
  }

  const after = getStorageStats()
  console.log('After:', JSON.stringify(after, null, 2))
  console.log('=== Cleanup complete ===')
  console.log(`Schema version set to: ${CURRENT_SCHEMA_VERSION}`)
  console.log('Refresh the page to reload fresh data.')
}

// Self-execute when run via CLI
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  // Running in browser
  const params = new URLSearchParams(window.location.search)
  if (params.get('cleanup') === 'true') {
    clearAllData()
  }
}