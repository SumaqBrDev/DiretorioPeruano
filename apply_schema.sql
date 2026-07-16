-- apply_schema.sql
CREATE TABLE IF NOT EXISTS "User" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  clerkId TEXT UNIQUE,
  email TEXT,
  name TEXT,
  role TEXT DEFAULT 'consumer',
  language TEXT DEFAULT 'pt-BR',
  createdAt TIMESTAMP DEFAULT now(),
  updatedAt TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "BusinessProfile" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  description TEXT,
  category TEXT DEFAULT 'restaurante',
  address JSONB,
  tags TEXT[],
  photos TEXT[],
  contact JSONB,
  status TEXT DEFAULT 'pending',
  ownerId TEXT REFERENCES "User"(id) ON DELETE CASCADE,
  createdAt TIMESTAMP DEFAULT now(),
  updatedAt TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "Review" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  rating INTEGER,
  comment TEXT,
  status TEXT DEFAULT 'pending',
  businessId TEXT REFERENCES "BusinessProfile"(id) ON DELETE CASCADE,
  consumerId TEXT REFERENCES "User"(id) ON DELETE CASCADE,
  createdAt TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "Message" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  fromBusinessId TEXT REFERENCES "BusinessProfile"(id) ON DELETE CASCADE,
  toBusinessId TEXT REFERENCES "BusinessProfile"(id) ON DELETE CASCADE,
  body TEXT,
  read BOOLEAN DEFAULT false,
  createdAt TIMESTAMP DEFAULT now()
);