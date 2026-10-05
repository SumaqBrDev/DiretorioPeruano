/**
 * Presentation helpers for business-facing listings.
 *
 * These exist because concatenating optional fields directly in JSX produced
 * user-visible artefacts: an address with a bare ", ," where a blank zip used
 * to be, a contact row whose icon stood beside nothing, and a category label
 * reading "3 em breve" because a count was glued to a coming-soon string.
 *
 * Keeping the rules here makes them testable without rendering, and makes the
 * empty-value cases explicit instead of incidental.
 */

export type BusinessAddress = {
  street?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
};

const clean = (value: string | null | undefined): string => (value ?? '').trim();

/**
 * Builds the single-line address shown on the business detail page.
 *
 * Empty parts are dropped rather than joined, and a city/state pair already
 * spelled out at the end of the street is not repeated — owners commonly type
 * the full address into the street field alone.
 */
export function formatBusinessAddress(address: BusinessAddress | null | undefined): string {
  if (!address) return '';

  const street = clean(address.street);
  const city = clean(address.city);
  const state = clean(address.state);
  const zip = clean(address.zip);

  // "São Paulo - SP", or just whichever half is known.
  const locality = [city, state].filter(Boolean).join(' - ');

  const parts: string[] = [];
  if (street) parts.push(street);

  if (locality) {
    const alreadyInStreet = street.toLowerCase().endsWith(locality.toLowerCase());
    if (!alreadyInStreet) parts.push(locality);
  }

  if (zip) parts.push(zip);

  return parts.join(', ');
}

export type ContactKind = 'address' | 'phone' | 'whatsapp' | 'email' | 'website';

export type ContactRow = { kind: ContactKind; value: string };

/**
 * Returns only the contact channels that actually carry a value, so the UI
 * never renders an icon next to an empty string.
 */
export function getContactRows(contact: {
  address?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  website?: string | null;
}): ContactRow[] {
  const order: ContactKind[] = ['address', 'phone', 'whatsapp', 'email', 'website'];

  return order
    .map((kind) => ({ kind, value: clean(contact[kind]) }))
    .filter((row) => row.value.length > 0);
}

/**
 * Labels a category tile: a listing count when the category has businesses,
 * the coming-soon label only when it is genuinely empty. The two are never
 * combined.
 */
export function formatCategoryCount(input: {
  count: number;
  comingSoonLabel: string;
  listingsLabel: string;
  singularLabel?: string;
}): string {
  if (input.count <= 0) return input.comingSoonLabel;

  const noun =
    input.count === 1 && input.singularLabel ? input.singularLabel : input.listingsLabel;

  return `${input.count} ${noun}`;
}

/**
 * Renders a homepage statistic.
 *
 * The "+" suffix means "at least this many", so it is dropped at zero: "0+"
 * claims more than none while the listing right below shows an empty
 * directory, which reads as a broken counter rather than an honest zero.
 */
export function formatStatValue(input: { value: number; suffix?: string }): string {
  if (input.value <= 0) return '0';
  return `${input.value}${input.suffix ?? ''}`;
}

export type RawSearchResult = {
  id?: string;
  name?: string;
  category?: string;
  city?: string;
  state?: string;
  rating?: number;
  reviewsCount?: number;
  tags?: string[] | null | string;
  coverImage?: string;
  description?: string;
};

export type NormalizedSearchResult = {
  id: string;
  name: string;
  category: string;
  city: string;
  state: string;
  rating: number;
  reviewsCount: number;
  tags: string[];
  coverImage: string;
  description: string;
};

/**
 * Sanitises the array that comes from the search endpoint so the results list
 * never calls `.map` on undefined or crashes on a malformed record.
 *
 * The endpoint sometimes returns businesses without tags, or with tags set to
 * null, or even as a string. The results list iterates `item.tags` directly;
 * any non-array value threw at render time and blanked the whole search page.
 */
export function normalizeSearchResults(
  input: RawSearchResult[] | null | undefined
): NormalizedSearchResult[] {
  if (!Array.isArray(input)) return [];

  return input
    .filter((r): r is RawSearchResult => typeof r === 'object' && r !== null)
    .map((r) => ({
      id: String(r.id ?? ''),
      name: String(r.name ?? ''),
      category: String(r.category ?? ''),
      city: String(r.city ?? ''),
      state: String(r.state ?? ''),
      rating: typeof r.rating === 'number' ? r.rating : 0,
      reviewsCount: typeof r.reviewsCount === 'number' ? r.reviewsCount : 0,
      tags: Array.isArray(r.tags) ? r.tags : [],
      coverImage: String(r.coverImage ?? ''),
      description: String(r.description ?? ''),
    }));
}
