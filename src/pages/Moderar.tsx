// src/pages/Moderar.tsx
import { useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import { ReviewModerationCard } from '@/components/ReviewModerationCard'

// Mock pending reviews for moderation
const mockPendingReviews = [
  {
    id: 'rev_1',
    rating: 4,
    comment: 'Excelente comida peruana! O ceviche estava fresco e o lomo saltado delicioso. Voltarei com certeza.',
    business: { name: 'Sabores do Peru' },
    consumer: { name: 'Maria Silva' },
    status: 'pending'
  },
  {
    id: 'rev_2',
    rating: 3,
    comment: 'Bom atendimento, mas o prato demorou um pouco para chegar. O pisco sour estava bom.',
    business: { name: 'Lima Criolla' },
    consumer: { name: 'João Santos' },
    status: 'pending'
  },
  {
    id: 'rev_3',
    rating: 5,
    comment: 'Melhor causa limeña que já comi no Brasil! Tempero autêntico, porção generosa. Recomendo demais.',
    business: { name: 'Ceviche House SP' },
    consumer: { name: 'Ana Costa' },
    status: 'pending'
  }
]

interface PendingReview {
  id: string
  rating: number
  comment: string
  business: { name: string }
  consumer: { name: string | null }
  status: string
}

export const Moderar = () => {
  const { user, isLoaded } = useUser()
  const [pendingReviews, setPendingReviews] = useState<PendingReview[]>(mockPendingReviews)

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-creme-andino">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-aji-rojo border-t-transparent"></div>
      </div>
    )
  }

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center bg-creme-andino">Acesso negado</div>
  }

  const handleApprove = (reviewId: string) => {
    setPendingReviews(prev => prev.map(r => r.id === reviewId ? { ...r, status: 'approved' } : r))
    alert(`Avaliação ${reviewId} aprovada!`)
  }

  const handleReject = (reviewId: string) => {
    setPendingReviews(prev => prev.filter(r => r.id !== reviewId))
    alert(`Avaliação ${reviewId} rejeitada!`)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="font-playfair text-3xl font-bold text-aji-rojo mb-8">Moderar Comentários</h1>
      <div className="space-y-4">
        {pendingReviews.map((review) => (
          <ReviewModerationCard
            key={review.id}
            review={review}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        ))}
      </div>
      {pendingReviews.length === 0 && (
        <div className="text-center py-12 text-gray-600">
          <p className="text-xl font-medium">Nenhuma avaliação pendente</p>
          <p className="mt-2">Todas as avaliações foram moderadas.</p>
        </div>
      )}
    </div>
  )
}