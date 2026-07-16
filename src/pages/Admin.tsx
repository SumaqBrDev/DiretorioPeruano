// src/pages/Admin.tsx
import { useUser } from '@clerk/clerk-react'
import { BusinessList } from '@/components/BusinessList'
import { StatsCard } from '@/components/StatsCard'

export const Admin = () => {
  const { user, isLoaded } = useUser()

  // Mock stats for demo
  const totalBusinesses = 12
  const totalUsers = 156
  const pendingReviews = 3

  if (!isLoaded) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-aji-rojo border-t-transparent mx-auto"></div>
      </div>
    )
  }

  if (!user) {
    return <div className="container mx-auto px-4 py-8 text-center">Acesso negado</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="font-playfair text-3xl font-bold text-aji-rojo mb-8">Painel do Administrador</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatsCard title="Total de Negócios" value={totalBusinesses} />
        <StatsCard title="Total de Usuários" value={totalUsers} />
        <StatsCard title="Comentários Pendentes" value={pendingReviews} />
      </div>
      <BusinessList />
    </div>
  )
}