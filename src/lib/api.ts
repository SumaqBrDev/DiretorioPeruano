// src/lib/api.ts
// API layer for ConectaPeru frontend — Netlify Functions with Clerk auth.
//
// Every protected call receives a Clerk session token (obtained via
// useAuth().getToken()) and sends it as:  Authorization: Bearer <token>
// The server validates it cryptographically (see netlify/functions/lib/auth.ts).

const API_BASE = ''; // relative: /.netlify/functions/* via netlify.toml redirect /api/*

export interface ApiBusiness {
  id: string;
  name: string;
  category: string;
  status: string;
  subscriptionStatus: string;
  rejectionReason?: string | null;
  approvedAt?: string | null;
  trialEndsAt?: string | null;
  createdAt: string;
  cnpj?: string | null;
  city?: string;
  state?: string;
  owner?: {
    id: string;
    name?: string | null;
    email?: string | null;
  } | null;
  reviewsCount?: number;
  // DisplayBusiness-ish fields mapped from localData for modal compatibility
  ownerFullName?: string;
  ownerBirthCity?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  } | null;
  description?: string;
  tags?: string[];
  photos?: string[];
}

export interface AdminListResult {
  businesses: ApiBusiness[];
  total: number;
  page: number;
  totalPages: number;
}

class ApiError extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

async function request<T>(
  endpoint: string,
  token: string,
  options: { method?: string; body?: unknown; query?: Record<string, string> } = {}
): Promise<T> {
  const { method = 'GET', body, query } = options;
  const queryString = query
    ? '?' + new URLSearchParams(query).toString()
    : '';
  const url = `${API_BASE}/.netlify/functions/${endpoint}${queryString}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new ApiError(0, 'Falha de rede ao acessar a API');
  }

  if (!response.ok) {
    let message = `Erro ${response.status}`;
    try {
      const data = await response.json();
      if (data?.error) message = data.error;
    } catch {
      // ignore
    }
    throw new ApiError(response.status, message);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return (await response.json()) as T;
  }
  return (await response.text()) as unknown as T;
}

// ── Superadmin API ──

export async function adminListBusinesses(
  token: string,
  filters?: { status?: string; search?: string; page?: number; limit?: number }
): Promise<AdminListResult> {
  const query: Record<string, string> = {};
  if (filters?.status && filters.status !== 'ALL') query.status = filters.status;
  if (filters?.search) query.search = filters.search;
  if (filters?.page) query.page = String(filters.page);
  query.limit = String(filters?.limit ?? 20);
  return request<AdminListResult>('admin-businesses', token, { query });
}

export async function adminApprove(token: string, businessId: string) {
  return request<{ business: ApiBusiness }>('admin-approve', token, {
    method: 'POST',
    body: { businessId },
  });
}

export async function adminReject(token: string, businessId: string, reason: string) {
  return request<{ business: ApiBusiness }>('admin-reject', token, {
    method: 'POST',
    body: { businessId, reason },
  });
}

export async function adminDelete(token: string, businessId: string) {
  return request<{ success: boolean }>('admin-delete', token, {
    method: 'DELETE',
    body: { businessId },
  });
}

export async function adminGetBetaMode(token: string): Promise<{ betaMode: boolean }> {
  return request<{ betaMode: boolean }>('admin-beta-mode', token, { method: 'GET' });
}

export async function adminSetBetaMode(token: string, betaMode: boolean) {
  return request<{ betaMode: boolean; message: string }>('admin-beta-mode', token, {
    method: 'POST',
    body: { betaMode },
  });
}

export { ApiError };

// ── "My business" (authenticated owner) ──

export async function getMyBusiness(token: string): Promise<ApiBusiness> {
  return request<ApiBusiness>('my-business', token, { method: 'GET' });
}

export async function updateMyBusiness(
  token: string,
  updates: {
    name?: string;
    description?: string;
    category?: string;
    tags?: string[];
    photos?: string[];
    address?: Partial<NonNullable<ApiBusiness['address']>>;
    contact?: Record<string, string>;
    cnpj?: string;
    ownerFullName?: string;
    ownerBirthCity?: string;
  }
): Promise<ApiBusiness> {
  return request<ApiBusiness>('my-business', token, {
    method: 'PUT',
    body: updates,
  });
}

export default {
  ApiError,
  adminListBusinesses,
  adminApprove,
  adminReject,
  adminDelete,
  adminGetBetaMode,
  adminSetBetaMode,
  getMyBusiness,
  updateMyBusiness,
};

// ── B2B Messages (Inbox) ──

export interface B2BMessage {
  id: string;
  fromBusinessId: string;
  fromBusinessName: string;
  toBusinessId: string;
  body: string;
  createdAt: string;
  read: boolean;
}

export interface B2BConversation {
  id: string; // sorted composite: smallerId_largerId
  participantIds: [string, string];
  participantNames: [string, string];
  messages: B2BMessage[];
  archivedBy: string[];
  deletedBy: string[];
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// Raw message shape from the backend GET /api/messages?conversationWith= (flat thread)
export interface RawMessage {
  id: string;
  fromBusinessId: string;
  toBusinessId: string;
  body: string;
  read: boolean;
  archived: boolean | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  fromBusiness?: { id: string; name: string | null };
  toBusiness?: { id: string; name: string | null };
}

// Summarized conversation shape from the backend GET /api/messages (grouped by partner)
export interface ConversationSummary {
  businessId: string;
  businessName: string;
  archived: boolean;
  deletedAt: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unread: number;
}

/** Fetch conversation summaries grouped by partner (no message bodies). */
export async function listConversations(token: string, businessId: string): Promise<ConversationSummary[]> {
  return request<ConversationSummary[]>('messages', token, {
    query: { businessId, archived: 'all' },
  });
}

/** Fetch the full message thread between two businesses (ascending order). */
export async function getConversationMessages(
  token: string,
  businessId: string,
  partnerId: string
): Promise<RawMessage[]> {
  return request<RawMessage[]>('messages', token, {
    query: { businessId, conversationWith: partnerId },
  });
}

/** Send a new B2B message. Returns the created message. */
export async function sendMessage(
  token: string,
  fromBusinessId: string,
  toBusinessId: string,
  body: string
): Promise<RawMessage> {
  return request<RawMessage>('messages', token, {
    method: 'POST',
    body: { fromBusinessId, toBusinessId, body },
  });
}

/** Mark a message as read. */
export async function markMessageRead(token: string, messageId: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>('messages', token, {
    method: 'PUT',
    body: { action: 'mark-read', messageId },
  });
}

/** Archive (or unarchive) a whole conversation between two businesses. */
export async function archiveConversation(
  token: string,
  businessId: string,
  partnerId: string,
  archived: boolean
): Promise<{ success: boolean }> {
  return request<{ success: boolean }>('messages', token, {
    method: 'PUT',
    body: { action: archived ? 'archive' : 'unarchive', businessId, partnerBusinessId: partnerId },
  });
}

/** Soft-delete a conversation (hidden 30 days, recoverable). */
export async function deleteConversation(
  token: string,
  businessId: string,
  partnerId: string
): Promise<{ success: boolean }> {
  return request<{ success: boolean }>('messages', token, {
    method: 'DELETE',
    body: { businessId, partnerBusinessId: partnerId },
  });
}

/** Public list of approved businesses (for B2B autocomplete). */
export async function getBusinessesPublic(token: string): Promise<Array<{ id: string; name: string }>> {
  const list = await request<Array<{ id: string; name: string; category?: string }>>('businesses', token, {
    query: { limit: '50' },
  });
  return list.map((b) => ({ id: b.id, name: b.name }));
}

// ── Onboarding (create business) ──

export interface CreateBusinessInput {
  name: string;
  description: string;
  category?: string;
  cnpj?: string;
  ownerFullName?: string;
  ownerBirthCity?: string;
  address?: Partial<NonNullable<ApiBusiness['address']>>;
  tags?: string[];
  photos?: string[];
  contact?: Record<string, string>;
  ownerId: string;
}

/** Create a new business (onboarding). Maps to POST /api/businesses. */
export async function createBusiness(token: string, data: CreateBusinessInput): Promise<ApiBusiness> {
  return request<ApiBusiness>('businesses', token, {
    method: 'POST',
    body: data,
  });
}

// ── Search & Business detail (Busca / Negocio) ──

export interface BusinessSearchResult {
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
}

/** Search approved businesses (GET /api/businesses with optional filters). */
export async function searchBusinesses(
  token: string,
  params?: { q?: string; category?: string; city?: string; minRating?: string }
): Promise<BusinessSearchResult[]> {
  const query: Record<string, string> = {};
  if (params?.q) query.q = params.q;
  if (params?.category) query.category = params.category;
  if (params?.city) query.city = params.city;
  if (params?.minRating) query.minRating = params.minRating;
  return request<BusinessSearchResult[]>('businesses', token, { query });
}

export interface BusinessDetail {
  id: string;
  name: string;
  category: string;
  description: string;
  city: string;
  state: string;
  address: { street: string; city: string; state: string; zip: string };
  cnpj: string | null;
  ownerFullName: string;
  ownerBirthCity: string;
  tags: string[];
  photos: string[];
  contact: Record<string, string>;
  rating: number;
  reviewsCount: number;
  email: string;
  phone: string;
  whatsapp: string;
  website: string;
}

/** Get a single approved business by id (GET /api/business-detail?id=). */
export async function getBusinessDetail(token: string, id: string): Promise<BusinessDetail> {
  return request<BusinessDetail>('business-detail', token, { query: { id } });
}

export interface BusinessReview {
  id: string;
  author: string;
  rating: number;
  comment: string;
  date: string;
}

/** Get approved reviews for a business (GET /api/reviews?businessId=). */
export async function getReviewsForBusiness(token: string, businessId: string): Promise<BusinessReview[]> {
  return request<BusinessReview[]>('reviews', token, { query: { businessId } });
}

/** Submit a new review (POST /api/reviews). */
export async function submitReview(
  token: string,
  data: { rating: number; comment: string; businessId: string; consumerId: string }
): Promise<{ success: boolean }> {
  return request<{ success: boolean }>('reviews', token, {
    method: 'POST',
    body: data,
  });
}

// ── Stripe (checkout & billing portal) ──

export async function openStripeCheckout(
  token: string,
  businessId: string
): Promise<{ url: string; betaMode?: boolean }> {
  return request<{ url: string; betaMode?: boolean }>('stripe-checkout', token, {
    method: 'POST',
    body: { businessId, plan: 'monthly' },
  });
}

export async function openStripePortal(
  token: string,
  businessId: string
): Promise<{ url: string }> {
  return request<{ url: string }>('stripe-portal', token, {
    method: 'POST',
    body: { businessId },
  });
}

// ── Home (useHomeStore, public read endpoints) ──

export interface HomeCategory {
  slug: string;
  name: Record<string, string>;
  icon: string;
  count: number;
}

export interface HomeFeatured {
  id: string;
  name: string;
  category: string;
  city: string;
  state: string;
  rating: number;
  reviewsCount: number;
  tags: string[];
  coverImage: string;
}

export interface HomeStat {
  label: string;
  value: number;
  suffix?: string;
}

export interface HomeTestimonial {
  id: string;
  author: string;
  city: string;
  rating: number;
  text: string;
  tags: string[];
  avatar?: string;
}

export interface CommunityReview {
  id: string;
  author: string;
  rating: number;
  comment: string;
  businessName?: string;
  date?: string;
}

/** GET /api/categories */
export async function getHomeCategories(token: string): Promise<HomeCategory[]> {
  return request<HomeCategory[]>('categories', token);
}

/** GET /api/featured */
export async function getHomeFeatured(token: string): Promise<HomeFeatured[]> {
  return request<HomeFeatured[]>('featured', token);
}

/** GET /api/stats */
export async function getHomeStats(token: string): Promise<HomeStat[]> {
  return request<HomeStat[]>('stats', token);
}

/** GET /api/testimonials */
export async function getHomeTestimonials(token: string): Promise<HomeTestimonial[]> {
  return request<HomeTestimonial[]>('testimonials', token);
}

/** GET /api/community-reviews */
export async function getCommunityReviews(token: string): Promise<CommunityReview[]> {
  return request<CommunityReview[]>('community-reviews', token);
}

// ── Community (foro) ──

export interface CommunityTopicSummary {
  id: string;
  title: string;
  author: string;
  postsCount: number;
  createdAt: string;
}

export interface CommunityTopicListResult {
  topics: CommunityTopicSummary[];
  total: number;
  page: number;
  totalPages: number;
}

export interface CommunityPostItem {
  id: string;
  body: string;
  author: string;
  parentAuthor: string | null;
  createdAt: string;
  score: number;
}

export interface CommunityTopicDetail {
  id: string;
  title: string;
  body: string;
  author: string;
  viewCount: number;
  createdAt: string;
  score: number;
}

export interface CommunityTopicDetailResult {
  topic: CommunityTopicDetail;
  posts: CommunityPostItem[];
}

export interface CommunityModerationQueue {
  topics: Array<{
    id: string;
    title: string;
    author: string;
    status: string;
    reported: boolean;
    updatedAt: string;
  }>;
  posts: Array<{
    id: string;
    body: string;
    author: string;
    topicTitle: string;
    status: string;
    reported: boolean;
    updatedAt: string;
  }>;
}

/** GET /api/community?q=&page=&limit= — public list + search */
export async function listCommunityTopics(
  token: string | null,
  query?: { q?: string; page?: number; limit?: number }
): Promise<CommunityTopicListResult> {
  const params: Record<string, string> = {};
  if (query?.q) params.q = query.q;
  if (query?.page) params.page = String(query.page);
  params.limit = String(query?.limit ?? 10);
  return request<CommunityTopicListResult>('community', token ?? '', { query: params });
}

/** GET /api/community?id= — public topic detail + posts */
export async function getCommunityTopic(
  token: string | null,
  id: string
): Promise<CommunityTopicDetailResult> {
  return request<CommunityTopicDetailResult>('community', token ?? '', { query: { id } });
}

/** POST /api/community — create topic (auth) */
export async function createCommunityTopic(
  token: string,
  data: { title: string; body: string }
): Promise<{ topic: { id: string } }> {
  return request<{ topic: { id: string } }>('community', token, {
    method: 'POST',
    body: { action: 'create-topic', ...data },
  });
}

/** POST /api/community — create post/reply (auth) */
export async function createCommunityPost(
  token: string,
  data: { topicId: string; body: string; parentId?: string | null }
): Promise<{ post: { id: string } }> {
  return request<{ post: { id: string } }>('community', token, {
    method: 'POST',
    body: { action: 'create-post', ...data },
  });
}

/** POST /api/community — toggle like/dislike (auth, topics + posts) */
export async function toggleCommunityVote(
  token: string,
  data: { targetType: 'topic' | 'post'; targetId: string; value: 1 | -1 }
): Promise<{ vote: unknown; score: number }> {
  return request<{ vote: unknown; score: number }>('community', token, {
    method: 'POST',
    body: { action: 'vote', ...data },
  });
}

/** POST /api/community — report content (auth, post-publication moderation) */
export async function reportCommunityContent(
  token: string,
  data: { targetType: 'topic' | 'post'; targetId: string }
): Promise<{ success: boolean }> {
  return request<{ success: boolean }>('community', token, {
    method: 'POST',
    body: { action: 'report', ...data },
  });
}

/** GET /api/admin-community — moderation queue (superadmin) */
export async function getCommunityModerationQueue(
  token: string,
  scope: 'reported' | 'all' = 'reported'
): Promise<CommunityModerationQueue> {
  return request<CommunityModerationQueue>('admin-community', token, { query: { scope } });
}

/** POST /api/admin-community — hide/restore/delete (superadmin) */
export async function moderateCommunityContent(
  token: string,
  data: { targetType: 'topic' | 'post'; targetId: string; action: 'hide' | 'restore' | 'delete' }
): Promise<{ success: boolean }> {
  return request<{ success: boolean }>('admin-community', token, {
    method: 'POST',
    body: data,
  });
}
