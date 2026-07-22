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
    bgClass: 'bg-aji-rojo/10 dark:bg-aji-rojo/15 border-aji-rojo/25',
    textClass: 'text-aji-rojo',
    iconBg: 'bg-aji-rojo text-white',
    hoverClass: 'hover:bg-aji-rojo/20 dark:hover:bg-aji-rojo/25 hover:border-aji-rojo/40',
  },
  {
    key: 'whatsapp',
    icon: WhatsappLogo,
    label: 'WhatsApp',
    href: (b: Business) =>
      `https://wa.me/${b.whatsapp.replace(/\D/g, '')}`,
    target: '_blank' as const,
    bgClass: 'bg-[#1a5c3a]/10 dark:bg-[#1a5c3a]/20 border-[#1a5c3a]/25',
    textClass: 'text-[#1a5c3a] dark:text-[#4ade80]',
    iconBg: 'bg-[#1a5c3a] text-white',
    hoverClass: 'hover:bg-[#1a5c3a]/20 dark:hover:bg-[#1a5c3a]/30 hover:border-[#1a5c3a]/40',
  },
  {
    key: 'website',
    icon: Globe,
    label: 'Site',
    href: (b: Business) => b.website,
    target: '_blank' as const,
    bgClass: 'bg-oro-inca/10 dark:bg-oro-inca/15 border-oro-inca/25',
    textClass: 'text-oro-inca dark:text-oro-inca',
    iconBg: 'bg-oro-inca text-noche-lima',
    hoverClass: 'hover:bg-oro-inca/20 dark:hover:bg-oro-inca/25 hover:border-oro-inca/40',
  },
  {
    key: 'email',
    icon: Envelope,
    label: 'Email',
    href: (b: Business) => `mailto:${b.email}`,
    bgClass: 'bg-white/50 dark:bg-white/5 border-gray-200 dark:border-white/10',
    textClass: 'text-gray-700 dark:text-gray-300',
    iconBg: 'bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-300',
    hoverClass: 'hover:bg-gray-100 dark:hover:bg-white/10 hover:border-gray-300 dark:hover:border-white/20',
  },
];

export const Sidebar = ({ business }: SidebarProps) => {
  return (
    <aside className="lg:col-span-1">
      <section className="bg-white dark:bg-noche-lima/95 rounded-2xl shadow-[0_4px_24px_-6px_rgba(192,57,43,0.08)] dark:shadow-[0_4px_24px_-6px_rgba(0,0,0,0.3)] border border-oro-inca/10 dark:border-white/5 p-6 space-y-5 sticky top-24 backdrop-blur-sm">
        {/* Header */}
        <div className="text-center pb-4 border-b border-oro-inca/10 dark:border-white/5">
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-aji-rojo/50 dark:text-aji-rojo/60">
            Ações Rápidas
          </span>
          <h3 className="text-base font-semibold text-noche-lima dark:text-white mt-1.5 leading-tight">
            {business.name}
          </h3>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          {CTAS.map(({ key, icon: Icon, label, href, target, bgClass, textClass, iconBg, hoverClass }) => (
            <a
              key={key}
              href={href(business)}
              target={target}
              rel={target === '_blank' ? 'noopener noreferrer' : undefined}
              className={`group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 active:scale-[0.97] border ${bgClass} ${textClass} ${hoverClass} shadow-sm`}
            >
              <span className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 transition-all duration-200 ${iconBg} shadow-sm group-hover:shadow-md group-hover:scale-105`}>
                <Icon size={16} weight="fill" />
              </span>
              <span className="flex-1">{label}</span>
              <span className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 text-xs">
                &rarr;
              </span>
            </a>
          ))}
        </div>

        {/* Footer tip */}
        <p className="text-[10px] text-center text-gray-400 dark:text-gray-600 pt-1">
          Toque para entrar em contato
        </p>
      </section>
    </aside>
  );
};
