interface StarRatingProps {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
}

export const StarRating = ({ rating, size = 'md' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - Math.floor(rating) - (rating % 1 >= 0.5 ? 1 : 0);

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-xl',
  };

  return (
    <div className="flex items-center gap-1" aria-label={`Avaliação ${rating} de 5 estrelas`}>
      {Array.from({ length: fullStars }).map((_, i) => (
        <span key={`full-${i}`} className={`${sizeClasses[size] || 'text-lg'} text-oro-inca`}>★</span>
      ))}
      {Array.from({ length: 5 - fullStars - (rating % 1 >= 0.5 ? 1 : 0) }).map((_, i) => (
        <span key={`empty-${i}`} className={`${sizeClasses[size] || 'text-lg'} text-gray-300 dark:text-gray-600`}>☆</span>
      ))}
    </div>
  );
}