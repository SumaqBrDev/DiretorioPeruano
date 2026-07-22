// src/components/InteractiveStarRating.tsx
// Clickable star rating component for review forms

import { useState } from 'react';

interface InteractiveStarRatingProps {
  value: number;
  onChange: (value: number) => void;
  size?: 'sm' | 'md' | 'lg';
}

export const InteractiveStarRating = ({ value, onChange, size = 'md' }: InteractiveStarRatingProps) => {
  const [hoveredValue, setHoveredValue] = useState(0);

  const sizeClasses = {
    sm: 'text-2xl',
    md: 'text-3xl',
    lg: 'text-4xl',
  };

  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Avaliação por estrelas">
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = (hoveredValue || value) >= star;
        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} estrela${star > 1 ? 's' : ''}`}
            className={`${sizeClasses[size] || 'text-3xl'} cursor-pointer transition-all duration-150 focus:outline-none focus:scale-110 ${
              isFilled
                ? 'text-oro-inca'
                : 'text-gray-300 dark:text-gray-600'
            } hover:text-oro-inca hover:scale-110 active:scale-95`}
            onMouseEnter={() => setHoveredValue(star)}
            onMouseLeave={() => setHoveredValue(0)}
            onClick={() => onChange(star)}
          >
            ★
          </button>
        );
      })}
      {value > 0 && (
        <span className="ml-2 text-sm font-medium text-noche-lima dark:text-gray-300">
          {value} de 5
        </span>
      )}
    </div>
  );
};
