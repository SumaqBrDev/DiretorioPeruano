import type { BusinessDetail, BusinessReview } from './api';
import type { DisplayBusiness } from './localData';
import { formatBusinessAddress } from './businessDisplay';
import { formatBusinessHoursForDisplay } from './businessHours';

export type DetailView = DisplayBusiness;

export function mapApiBusinessDetailToDisplay(
  detail: BusinessDetail,
  reviews: BusinessReview[]
): DetailView {
  const hours = formatBusinessHoursForDisplay(detail.hours).map((entry) => ({
    day: entry.day,
    time: entry.hours,
    isOpen: entry.hours !== 'Fechado',
  }));

  return {
    id: parseInt(detail.id.replace(/\D/g, '').slice(0, 9), 10) || 0,
    name: detail.name,
    category: detail.category,
    city: detail.city ? `${detail.city} - ${detail.state}` : detail.state,
    address: formatBusinessAddress(detail.address),
    rating: detail.rating || 0,
    reviewsCount: detail.reviewsCount || reviews.length,
    tags: detail.tags || [],
    about: detail.description || '',
    images: detail.photos || [],
    hours,
    phone: detail.phone || '',
    whatsapp: detail.whatsapp || '',
    website: detail.website || '',
    email: detail.email || '',
    mapsUrl: detail.mapsUrl || '',
    latitude: 0,
    longitude: 0,
    menu: [],
    reviews: reviews.map((review) => ({
      id: review.id,
      author: review.author,
      rating: review.rating,
      date: review.date,
      text: review.comment,
      tags: [],
    })),
    localId: detail.id,
  };
}
