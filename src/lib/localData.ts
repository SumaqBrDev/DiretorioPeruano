// src/lib/localData.ts
// Helper para localStorage con fallback API
// Proporciona persistencia local para negocios, reseñas y conversaciones

export interface Business {
  id: string;
  name: string;
  description: string;
  category: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  tags: string[];
  photos: string[];
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  businessId: string;
  author: string;
  rating: number;
  text: string;
  userId: string;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  businessId: string;
  businessName: string;
  userId: string;
  userName: string;
  messages: Message[];
  archived: boolean;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEYS = {
  businesses: 'diretorio_peruano_businesses',
  reviews: 'diretorio_peruano_reviews',
  conversations: 'diretorio_peruano_conversations',
};

// --- Businesses ---

export function getBusinesses(): Business[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.businesses);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveBusiness(business: Omit<Business, 'id' | 'createdAt' | 'updatedAt'>): Business {
  const businesses = getBusinesses();
  const now = new Date().toISOString();
  const newBusiness: Business = {
    ...business,
    id: crypto.randomUUID?.() || `bus_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    updatedAt: now,
  };
  businesses.push(newBusiness);
  localStorage.setItem(STORAGE_KEYS.businesses, JSON.stringify(businesses));
  return newBusiness;
}

export function updateBusiness(id: string, updates: Partial<Business>): Business | null {
  const businesses = getBusinesses();
  const index = businesses.findIndex(b => b.id === id);
  if (index === -1) return null;
  businesses[index] = { ...businesses[index], ...updates, updatedAt: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEYS.businesses, JSON.stringify(businesses));
  return businesses[index];
}

/**
 * Convenience helper to update only the photos array of a business.
 * Persists immediately to localStorage.
 */
export function updateBusinessPhotos(id: string, photos: string[]): Business | null {
  return updateBusiness(id, { photos });
}

// --- Reviews ---

export function getReviews(businessId: string): Review[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.reviews);
    const allReviews: Review[] = data ? JSON.parse(data) : [];
    return allReviews.filter(r => r.businessId === businessId);
  } catch {
    return [];
  }
}

export function saveReview(businessId: string, review: Omit<Review, 'id' | 'businessId' | 'createdAt'>): Review {
  const data = localStorage.getItem(STORAGE_KEYS.reviews);
  const allReviews: Review[] = data ? JSON.parse(data) : [];
  const newReview: Review = {
    ...review,
    id: crypto.randomUUID?.() || `rev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    businessId,
    createdAt: new Date().toISOString(),
  };
  allReviews.push(newReview);
  localStorage.setItem(STORAGE_KEYS.reviews, JSON.stringify(allReviews));
  return newReview;
}

// --- Conversations ---

export function getConversations(): Conversation[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.conversations);
    const all: Conversation[] = data ? JSON.parse(data) : [];
    return all.filter(c => !c.deleted && !c.archived);
  } catch {
    return [];
  }
}

export function getArchivedConversations(): Conversation[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.conversations);
    const all: Conversation[] = data ? JSON.parse(data) : [];
    return all.filter(c => c.archived && !c.deleted);
  } catch {
    return [];
  }
}

export function getConversation(id: string): Conversation | undefined {
  const data = localStorage.getItem(STORAGE_KEYS.conversations);
  if (!data) return undefined;
  const all: Conversation[] = JSON.parse(data);
  return all.find(c => c.id === id);
}

export function saveMessage(conversationId: string, message: Omit<Message, 'id' | 'conversationId' | 'createdAt'>): { conversation: Conversation; message: Message } {
  const data = localStorage.getItem(STORAGE_KEYS.conversations);
  const all: Conversation[] = data ? JSON.parse(data) : [];
  let conv = all.find(c => c.id === conversationId);

  if (!conv) {
    // Create a new conversation if it doesn't exist
    const now = new Date().toISOString();
    conv = {
      id: conversationId,
      businessId: '',
      businessName: '',
      userId: message.senderId,
      userName: '',
      messages: [],
      archived: false,
      deleted: false,
      createdAt: now,
      updatedAt: now,
    };
    all.push(conv);
  }

  const newMessage: Message = {
    ...message,
    id: crypto.randomUUID?.() || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    conversationId,
    createdAt: new Date().toISOString(),
  };

  conv.messages.push(newMessage);
  conv.updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEYS.conversations, JSON.stringify(all));

  return { conversation: conv, message: newMessage };
}

export function archiveConversation(id: string): boolean {
  const data = localStorage.getItem(STORAGE_KEYS.conversations);
  if (!data) return false;
  const all: Conversation[] = JSON.parse(data);
  const conv = all.find(c => c.id === id);
  if (!conv) return false;
  conv.archived = true;
  conv.updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEYS.conversations, JSON.stringify(all));
  return true;
}

export function deleteConversation(id: string): boolean {
  const data = localStorage.getItem(STORAGE_KEYS.conversations);
  if (!data) return false;
  const all: Conversation[] = JSON.parse(data);
  const conv = all.find(c => c.id === id);
  if (!conv) return false;
  conv.deleted = true;
  conv.updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEYS.conversations, JSON.stringify(all));
  return true;
}

// ──────────────────────────────────────────────
// B2B Messaging (chat-style, business-to-business)
// ──────────────────────────────────────────────

const B2B_STORAGE_KEY = 'diretorio_peruano_b2b';

export interface B2BMessage {
  id: string;
  fromBusinessId: string;
  fromBusinessName: string;
  body: string;
  createdAt: string;
  read: boolean;
}

/**
 * Shared conversation between two businesses.
 * archivedBy / deletedBy track per-business state.
 */
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

function getB2BStore(): B2BConversation[] {
  try {
    const data = localStorage.getItem(B2B_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveB2BStore(convs: B2BConversation[]): void {
  localStorage.setItem(B2B_STORAGE_KEY, JSON.stringify(convs));
}

function makeConvId(a: string, b: string): string {
  return [a, b].sort().join('_');
}

export function getB2BConversations(businessId: string): B2BConversation[] {
  const all = getB2BStore();
  return all.filter(c =>
    c.participantIds.includes(businessId) &&
    !c.archivedBy.includes(businessId) &&
    !c.deletedBy.includes(businessId)
  ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function getB2BArchivedConversations(businessId: string): B2BConversation[] {
  const all = getB2BStore();
  return all.filter(c =>
    c.participantIds.includes(businessId) &&
    c.archivedBy.includes(businessId) &&
    !c.deletedBy.includes(businessId)
  ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function getB2BTrashConversations(businessId: string): B2BConversation[] {
  const all = getB2BStore();
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  return all.filter(c =>
    c.participantIds.includes(businessId) &&
    c.deletedBy.includes(businessId) &&
    c.deletedAt !== null &&
    new Date(c.deletedAt).getTime() > thirtyDaysAgo
  );
}

export function saveB2BMessage(
  fromBusinessId: string,
  fromBusinessName: string,
  toBusinessId: string,
  toBusinessName: string,
  body: string
): { conversation: B2BConversation; message: B2BMessage } {
  const all = getB2BStore();
  const convId = makeConvId(fromBusinessId, toBusinessId);
  let conv = all.find(c => c.id === convId);

  if (!conv) {
    const now = new Date().toISOString();
    conv = {
      id: convId,
      participantIds: [fromBusinessId, toBusinessId].sort() as [string, string],
      participantNames: [fromBusinessName, toBusinessName],
      messages: [],
      archivedBy: [],
      deletedBy: [],
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    all.push(conv);
  }

  const newMessage: B2BMessage = {
    id: crypto.randomUUID?.() || `b2b_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    fromBusinessId,
    fromBusinessName,
    body,
    createdAt: new Date().toISOString(),
    read: false,
  };

  // If returning to active (was archived/deleted), remove that state
  conv.archivedBy = conv.archivedBy.filter(id => id !== fromBusinessId);
  conv.deletedBy = conv.deletedBy.filter(id => id !== fromBusinessId);
  if (conv.deletedAt) conv.deletedAt = null;

  conv.messages.push(newMessage);
  conv.updatedAt = new Date().toISOString();
  saveB2BStore(all);

  return { conversation: conv, message: newMessage };
}

export function toggleArchiveB2B(conversationId: string, businessId: string): boolean {
  const all = getB2BStore();
  const conv = all.find(c => c.id === conversationId);
  if (!conv) return false;

  if (conv.archivedBy.includes(businessId)) {
    conv.archivedBy = conv.archivedBy.filter(id => id !== businessId);
  } else {
    conv.archivedBy.push(businessId);
  }
  conv.updatedAt = new Date().toISOString();
  saveB2BStore(all);
  return true;
}

export function softDeleteB2B(conversationId: string, businessId: string): boolean {
  const all = getB2BStore();
  const conv = all.find(c => c.id === conversationId);
  if (!conv) return false;

  if (!conv.deletedBy.includes(businessId)) {
    conv.deletedBy.push(businessId);
  }
  if (!conv.deletedAt) {
    conv.deletedAt = new Date().toISOString();
  }
  conv.updatedAt = new Date().toISOString();
  saveB2BStore(all);
  return true;
}

// ──────────────────────────────────────────────
// Seed data for B2B (first run)
// ──────────────────────────────────────────────

export function seedB2BData(): void {
  const existing = localStorage.getItem(B2B_STORAGE_KEY);
  if (existing) return;

  const now = new Date();
  const t = (minutesAgo: number) => new Date(now.getTime() - minutesAgo * 60000).toISOString();

  const conversations: B2BConversation[] = [
    {
      id: 'biz-1_biz-2',
      participantIds: ['biz-1', 'biz-2'],
      participantNames: ['Sabores do Peru', 'Lima Criolla'],
      archivedBy: [],
      deletedBy: [],
      deletedAt: null,
      createdAt: t(120),
      updatedAt: t(30),
      messages: [
        {
          id: 'b2b_seed_1',
          fromBusinessId: 'biz-2',
          fromBusinessName: 'Lima Criolla',
          body: 'Olá! Gostaria de saber se vocês têm interesse em uma parceria para fornecer ingredientes peruanos.',
          createdAt: t(120),
          read: true,
        },
        {
          id: 'b2b_seed_2',
          fromBusinessId: 'biz-1',
          fromBusinessName: 'Sabores do Peru',
          body: 'Sim, temos interesse! Quais ingredientes vocês precisam? Temos ají amarillo, ají panca, rocoto fresco...',
          createdAt: t(90),
          read: true,
        },
        {
          id: 'b2b_seed_3',
          fromBusinessId: 'biz-2',
          fromBusinessName: 'Lima Criolla',
          body: 'Perfeito! Precisamos de ají amarillo e rocoto para o novo cardápio. Podemos marcar uma reunião para acertar os detalhes?',
          createdAt: t(30),
          read: false,
        },
      ],
    },
    {
      id: 'biz-1_biz-3',
      participantIds: ['biz-1', 'biz-3'],
      participantNames: ['Sabores do Peru', 'Ceviche House SP'],
      archivedBy: [],
      deletedBy: [],
      deletedAt: null,
      createdAt: t(180),
      updatedAt: t(180),
      messages: [
        {
          id: 'b2b_seed_4',
          fromBusinessId: 'biz-3',
          fromBusinessName: 'Ceviche House SP',
          body: 'Vocês fazem delivery para a zona sul de SP? Gostaria de pedir uns ceviches para um evento corporativo na próxima semana.',
          createdAt: t(180),
          read: false,
        },
      ],
    },
    {
      id: 'biz-1_biz-4',
      participantIds: ['biz-1', 'biz-4'],
      participantNames: ['Sabores do Peru', 'Andina Grill'],
      archivedBy: ['biz-1'],
      deletedBy: [],
      deletedAt: null,
      createdAt: t(300),
      updatedAt: t(240),
      messages: [
        {
          id: 'b2b_seed_5',
          fromBusinessId: 'biz-4',
          fromBusinessName: 'Andina Grill',
          body: 'Olá! Vamos fazer um festival gastronômico no próximo mês e gostaríamos de convidar vocês para participar conosco!',
          createdAt: t(300),
          read: true,
        },
        {
          id: 'b2b_seed_6',
          fromBusinessId: 'biz-1',
          fromBusinessName: 'Sabores do Peru',
          body: 'Que legal! Adoraríamos participar. Me mandem mais detalhes sobre as datas e o formato do evento.',
          createdAt: t(240),
          read: true,
        },
      ],
    },
  ];

  saveB2BStore(conversations);
}
