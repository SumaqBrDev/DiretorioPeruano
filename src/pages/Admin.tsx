// src/pages/Admin.tsx
import { useUser, useAuth } from '@clerk/clerk-react'
import { useEffect, useState } from 'react'
import { BusinessList } from '@/components/BusinessList'
import { StatsCard } from '@/components/StatsCard'
import { searchBusinesses, getHomeStats, type HomeStat } from '@/lib/api'

export const Admin = () => {
  const { user, isLoaded } = useUser()
  const { getToken } = useAuth()

  const [stats, setStats] = useState<HomeStat[]>([])
  const [businessCount, setBusinessCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const token = await getToken()
        if (!token) return
        const [statList, biz] = await Promise.all([
          getHomeStats(token),
          searchBusinesses(token),
        ])
        if (cancelled) return
        setStats(statList as HomeStat[])
        setBusinessCount(biz.length)
      } catch {
        if (!cancelled) {
          setStats([])
          setBusinessCount(0)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [getToken])

  if (!isLoaded || loading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-aji-rojo border-t-transparent mx-auto"></div>
      </div>
    )
  }

  if (!user) {
    return <div className="container mx-auto px-4 py-8 text-center">Acesso negado</div>
  }

  // Resolve stat values by label
  const statValue = (labelPart: string) =>
    stats.find((s) => s.label.includes(labelPart))?.value ?? 0

  const approvedBiz = statValue('stats.businesses')
  const totalReviews = statValue('stats.reviews')
  const totalCities = statValue('stats.cities')

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="font-playfair text-3xl font-bold text-aji-rojo mb-8">Painel do Administrador</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatsCard title="Negócios Ativos" value={businessCount || approvedBiz} />
        <StatsCard title="Cidades" value={totalCities} />
        <StatsCard title="Avaliações Aprovadas" value={totalReviews} />
      </div>
      <BusinessList />
    </div>
  )
}
