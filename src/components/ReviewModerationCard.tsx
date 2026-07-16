// src/components/ReviewModerationCard.tsx

interface ReviewModerationCardProps {
  review: {
    id: string
    rating: number
    comment: string
    business: { name: string }
    consumer: { name: string | null }
    status: string
  }
  onApprove: (reviewId: string) => void
  onReject: (reviewId: string) => void
}

export const ReviewModerationCard = ({ review, onApprove, onReject }: ReviewModerationCardProps) => {
  return (
    <div className="bg-white dark:bg-noche-lima p-6 rounded-xl shadow-lg border border-oro-inca/20">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-noche-lima dark:text-white">{review.consumer.name || 'Usuário Anônimo'}</h3>
            <span className="bg-oro-inca/20 text-oro-inca px-2 py-1 rounded-full text-xs font-medium capitalize">{review.status}</span>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">{review.business.name}</p>
          <div className="flex gap-1 my-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <span key={star} className={star <= review.rating ? 'text-oro-inca' : 'text-gray-300 dark:text-gray-600'}>
                ⭐
              </span>
            ))}
          </div>
          <p className="text-gray-700 dark:text-gray-300">{review.comment}</p>
        </div>
        <div className="flex flex-col gap-2 ml-4">
          <button
            onClick={() => onApprove(review.id)}
            className="bg-verde-brasil text-white px-4 py-2 rounded-xl font-semibold hover:bg-verde-brasil/90 transition-colors"
          >
            Aprovar
          </button>
          <button
            onClick={() => onReject(review.id)}
            className="bg-aji-rojo text-white px-4 py-2 rounded-xl font-semibold hover:bg-aji-rojo/90 transition-colors"
          >
            Rejeitar
          </button>
        </div>
      </div>
    </div>
  )
}