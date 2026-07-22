import { Phone, WhatsappLogo, Globe, Envelope } from '@phosphor-icons/react';
import { Business } from '../data/mockBusinesses';

interface SidebarProps {
  business: Business;
}

const CTAS = [
  {
    key: 'phone',
    icon: Phone,
    label: 'Ligar',
    href: (b: Business) => `tel:${b.phone}`,
    className:
      'bg-aji-rojo text-white hover:bg-aji-rojo/90 shadow-md hover:shadow-lg',
  },
  {
    key: 'whatsapp',
    icon: WhatsappLogo,
    label: 'WhatsApp',
    href: (b: Business) =>
      `https://wa.me/${b.whatsapp.replace(/\D/g, '')}`,
    target: '_blank' as const,
    className:
      'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md hover:shadow-lg',
  },
  {
    key: 'website',
    icon: Globe,
    label: 'Site',
    href: (b: Business) => b.website,
    target: '_blank' as const,
    className:
      'bg-oro-inca text-noche-lima hover:bg-oro-inca/90 shadow-md hover:shadow-lg font-bold',
  },
  {
    key: 'email',
    icon: Envelope,
    label: 'Email',
    href: (b: Business) => `mailto:${b.email}`,
    className:
      'border border-oro-inca/30 text-noche-lima dark:text-white hover:bg-oro-inca/10 dark:hover:bg-white/5',
  },
];

export const Sidebar = ({ business }: SidebarProps) => {
  return (
    <aside className="lg:col-span-1 space-y-6">
      <section className="bg-white dark:bg-noche-lima rounded-2xl shadow-lg p-6 border border-oro-inca/10 space-y-5 sticky top-24">
        {/* Header */}
        <div className="text-center pb-3 border-b border-oro-inca/10">
          <span className="text-[11px] font-mono uppercase tracking-[0.15em] text-aji-rojo/60">
            Ações Rápidas
          </span>
          <h3 className="text-lg font-bold text-noche-lima dark:text-white mt-1">
            {business.name}
          </h3>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          {CTAS.map(({ key, icon: Icon, label, href, target, className }) => (
            <a
              key={key}
              href={href(business)}
              target={target}
              rel={target === '_blank' ? 'noopener noreferrer' : undefined}
              className={`group flex items-center gap-3 px-5 py-3 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-[0.98] ${className}`}
            >
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/20 dark:bg-white/10 shrink-0 transition-transform group-hover:scale-110">
                <Icon size={18} weight="fill" />
              </span>
              <span className="flex-1">{label}</span>
              <span className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 text-xs">
                &rarr;
              </span>
            </a>
          ))}
        </div>

        {/* Tip */}
        <p className="text-[11px] text-center text-gray-400 dark:text-gray-500 pt-1">
          Toque para entrar em contato direto
        </p>
      </section>
    </aside>
  );
};
