-- prisma/migration_ads.sql
-- Paid community ads (Opción A+B: sidebar + featured card en Comunidad).
-- Solo negocios aprobados CON suscripción activa; pago one-time R$30/30 días
-- vía PaymentIntent de Stripe. Identificadores ENTRE COMILLAS para preservar
-- camelCase y coincidir con prisma/schema.prisma (ver apply_schema.sql header).

CREATE TABLE IF NOT EXISTS "BusinessAd" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "businessId" TEXT REFERENCES "BusinessProfile"(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  "imageUrl" TEXT,
  "targetUrl" TEXT,
  status TEXT DEFAULT 'pending',
  "stripePaymentId" TEXT UNIQUE,
  "startsAt" TIMESTAMP,
  "endsAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT now(),
  "updatedAt" TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_businessad_status ON "BusinessAd"(status);
CREATE INDEX IF NOT EXISTS idx_businessad_ends_at ON "BusinessAd"("endsAt");
CREATE INDEX IF NOT EXISTS idx_businessad_business ON "BusinessAd"("businessId");
