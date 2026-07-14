export interface Empresa {
  id: string;
  name: string;
  description: string;
  category: string;
  location: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  rating: number;
  imageUrl?: string;
  hours?: {
    [day: string]: string;
  };
}

export interface SearchFilters {
  query: string;
  category?: string;
  location?: string;
  minRating?: number;
}