interface StarRatingProps {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
}

export const StarRating = ({ rating, size = 'md' }: StarRatingProps) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

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
      {hasHalfStar && (
        <span className={`${sizeClasses[size] || 'text-lg'} text-oro-inca/70`}>⯪</span>
      )}
      {Array.from({ length: emptyStars }).map((_, i) => (
        <span key={`empty-${i}`} className={`${sizeClasses[size] || 'text-lg'} text-gray-300 dark:text-gray-600`}>☆</span>
      ))}
    </div>
  );
}
