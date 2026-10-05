import type { DisplayBusiness } from '@/lib/localData';
import { getContactRows, type ContactKind } from '@/lib/businessDisplay';

interface ContactInfoSectionProps {
  business: DisplayBusiness;
}

const ICONS: Record<ContactKind, string> = {
  address: '📍',
  phone: '📞',
  whatsapp: '📱',
  email: '✉️',
  website: '🌐',
};

/** Builds the clickable target for a channel, or null when it is plain text. */
function hrefFor(kind: ContactKind, value: string): string | null {
  switch (kind) {
    case 'phone':
      return `tel:${value}`;
    case 'whatsapp':
      return `https://wa.me/${value.replace(/\D/g, '')}`;
    case 'email':
      return `mailto:${value}`;
    case 'website':
      return value;
    default:
      return null;
  }
}

const LINK_CLASS: Partial<Record<ContactKind, string>> = {
  whatsapp: 'hover:text-green-600',
};

export const ContactInfoSection = ({ business }: ContactInfoSectionProps) => {
  // Only channels the owner actually filled in are listed: an icon standing
  // beside an empty value reads as a broken page, not as missing data.
  const rows = getContactRows({
    address: [business.address, business.city].filter(Boolean).join(', '),
    phone: business.phone,
    whatsapp: business.whatsapp,
    email: business.email,
    website: business.website,
  });

  if (rows.length === 0) return null;

  return (
    <section className="mb-12">
      <div className="bg-white dark:bg-noche-lima rounded-2xl shadow-lg p-8 border border-oro-inca/20">
        <h2 className="font-playfair text-2xl font-bold text-noche-lima dark:text-white mb-4">Contato</h2>
        <dl className="space-y-3">
          {rows.map((row) => {
            const href = hrefFor(row.kind, row.value);
            const linkClass = LINK_CLASS[row.kind] || 'hover:text-aji-rojo';

            return (
              <div key={row.kind} className="flex items-center gap-3">
                <span className="text-2xl">{ICONS[row.kind]}</span>
                <dd className="text-gray-700 dark:text-gray-300 break-words min-w-0">
                  {href ? (
                    <a
                      href={href}
                      className={linkClass}
                      {...(row.kind === 'whatsapp' || row.kind === 'website'
                        ? { target: '_blank', rel: 'noopener noreferrer' }
                        : {})}
                    >
                      {row.value}
                    </a>
                  ) : (
                    row.value
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
      </div>
    </section>
  );
};
