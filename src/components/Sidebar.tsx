import { Phone, WhatsappLogo, Globe, Envelope, MapPin, Clock, Star } from '@phosphor-icons/react';
import type { DisplayBusiness } from '../lib/localData';

interface SidebarProps {
  business: DisplayBusiness;
}

const formatPhoneForWhatsApp = (phone: string) => {
  return phone.replace(/\D/g, '');
};

const formatPhoneForTel = (phone: string) => {
  return phone;
};

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    'Restaurante': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    'Mercado': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'Salão': 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
    'Serviços': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'Saúde': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    'Jurídico': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    'Financeiro': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    'Imóveis': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  };
  return colors[category] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
};

export const Sidebar = ({ business }: SidebarProps) => {
  const isOpenNow = () => {
    const now = new Date();
    const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const today = dayNames[now.getDay()];
    const todayHours = business.hours.find(h => h.day === today);
    if (!todayHours || !todayHours.isOpen) return false;
    
    const [openStr, closeStr] = todayHours.time.split(' - ');
    if (!openStr || !closeStr) return false;
    
    const [openH, openM] = openStr.split(':').map(Number);
    const [closeH, closeM] = closeStr.split(':').map(Number);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;
    
    return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
  };

  const openStatus = isOpenNow();

  return (
    <aside className="lg:col-span-1 space-y-6">
      <section className="bg-white dark:bg-zinc-900/80 rounded-2xl shadow-lg p-6 border border-oro-inca/10 space-y-6 sticky top-24">
        {/* Header */}
        <div className="text-center pb-4 border-b border-oro-inca/10">
          <span className="text-[11px] font-mono uppercase tracking-[0.15em] text-aji-rojo/60">
            Ações Rápidas
          </span>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white mt-1 truncate">
            {business.name}
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {business.city}
          </p>
        </div>

        {/* Status Badge */}
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mx-auto w-fit ${
          openStatus
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        }`}>
          <span className={`w-2 h-2 rounded-full ${openStatus ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`} />
          {openStatus ? 'Aberto agora' : 'Fechado no momento'}
        </div>

        {/* Rating Summary */}
        <div className="text-center py-3 border-y border-oro-inca/10">
          <div className="flex items-center justify-center gap-1 mb-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star key={star} size={16} weight="fill" className={star <= Math.round(business.rating) ? 'text-oro-inca' : 'text-zinc-300 dark:text-zinc-600'} />
            ))}
          </div>
          <p className="text-xl font-bold text-zinc-900 dark:text-white">
            {business.rating.toFixed(1)}
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {business.reviewsCount} {business.reviewsCount === 1 ? 'avaliação' : 'avaliações'}
          </p>
        </div>

        {/* Category Tag */}
        <div className="text-center">
          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(business.category)}`}>
            {business.category}
          </span>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-oro-inca/30 to-transparent" />

        {/* Action Buttons */}
        <div className="space-y-2.5">
          {/* Phone */}
          <a
            href={`tel:${formatPhoneForTel(business.phone)}`}
            className="group flex items-center gap-3 px-4 py-3 rounded-xl bg-aji-rojo/5 dark:bg-aji-rojo/10 text-aji-rojo hover:bg-aji-rojo/10 dark:hover:bg-aji-rojo/20 border border-aji-rojo/10 dark:border-aji-rojo/20 transition-all duration-200 active:scale-[0.98]"
          >
            <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-aji-rojo/10 dark:bg-aji-rojo/20 shrink-0 transition-transform group-hover:scale-110">
              <Phone size={20} weight="fill" />
            </span>
            <div className="flex-1 text-left min-w-0">
              <p className="text-[11px] font-mono uppercase tracking-[0.1em] text-aji-rojo/60">Telefone</p>
              <p className="font-semibold text-zinc-900 dark:text-white truncate">{business.phone}</p>
            </div>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-aji-rojo/60">
              →
            </span>
          </a>

          {/* WhatsApp */}
          <a
            href={`https://wa.me/${formatPhoneForWhatsApp(business.whatsapp)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-900/30 transition-all duration-200 active:scale-[0.98]"
          >
            <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-100/50 dark:bg-emerald-900/30 shrink-0 transition-transform group-hover:scale-110">
              <WhatsappLogo size={20} weight="fill" />
            </span>
            <div className="flex-1 text-left min-w-0">
              <p className="text-[11px] font-mono uppercase tracking-[0.1em] text-emerald-600 dark:text-emerald-500">WhatsApp</p>
              <p className="font-semibold text-zinc-900 dark:text-white truncate">Conversar agora</p>
            </div>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-emerald-600">
              →
            </span>
          </a>

          {/* Website */}
          {business.website && (
            <a
              href={business.website}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 px-4 py-3 rounded-xl bg-oro-inca/10 dark:bg-oro-inca/20 text-oro-inca hover:bg-oro-inca/20 dark:hover:bg-oro-inca/30 border border-oro-inca/20 dark:border-oro-inca/30 transition-all duration-200 active:scale-[0.98]"
            >
              <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-oro-inca/20 dark:bg-oro-inca/30 shrink-0 transition-transform group-hover:scale-110">
                <Globe size={20} weight="fill" />
              </span>
              <div className="flex-1 text-left min-w-0">
                <p className="text-[11px] font-mono uppercase tracking-[0.1em] text-oro-inca/70">Site</p>
                <p className="font-semibold text-zinc-900 dark:text-white truncate">
                  {business.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                </p>
              </div>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity text-oro-inca/70">
                →
              </span>
            </a>
          )}

          {/* Email */}
          {business.email && (
            <a
              href={`mailto:${business.email}`}
              className="group flex items-center gap-3 px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-all duration-200 active:scale-[0.98]"
            >
              <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 shrink-0 transition-transform group-hover:scale-110">
                <Envelope size={20} weight="fill" className="text-zinc-600 dark:text-zinc-400" />
              </span>
              <div className="flex-1 text-left min-w-0">
                <p className="text-[11px] font-mono uppercase tracking-[0.1em] text-zinc-500">E-mail</p>
                <p className="font-semibold text-zinc-900 dark:text-white truncate">{business.email}</p>
              </div>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400">
                →
              </span>
            </a>
          )}

          {/* Directions */}
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(business.address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3 px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-all duration-200 active:scale-[0.98]"
          >
            <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 shrink-0 transition-transform group-hover:scale-110">
              <MapPin size={20} weight="fill" className="text-zinc-600 dark:text-zinc-400" />
            </span>
            <div className="flex-1 text-left min-w-0">
              <p className="text-[11px] font-mono uppercase tracking-[0.1em] text-zinc-500">Como chegar</p>
              <p className="font-semibold text-zinc-900 dark:text-white truncate">Abrir no Maps</p>
            </div>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400">
              →
            </span>
          </a>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-oro-inca/30 to-transparent" />

        {/* Quick Info Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 text-center">
            <Clock size={20} weight="fill" className="text-aji-rojo mx-auto mb-1" />
            <p className="text-[10px] font-mono uppercase tracking-[0.1em] text-zinc-500">Horário</p>
            <p className="text-sm font-semibold text-zinc-900 dark:text-white">
              {openStatus ? 'Aberto' : 'Fechado'}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 text-center">
            <MapPin size={20} weight="fill" className="text-oro-inca mx-auto mb-1" />
            <p className="text-[10px] font-mono uppercase tracking-[0.1em] text-zinc-500">Endereço</p>
            <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
              {business.city.split(' - ')[0]}
            </p>
          </div>
        </div>

        {/* Tags */}
        {business.tags.length > 0 && (
          <div>
            <p className="text-[11px] font-mono uppercase tracking-[0.15em] text-zinc-500 mb-2">Especialidades</p>
            <div className="flex flex-wrap gap-1.5">
              {business.tags.slice(0, 6).map((tag, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 text-[11px] rounded-full bg-aji-rojo/10 dark:bg-aji-rojo/20 text-aji-rojo dark:text-aji-rojo/80 font-medium border border-aji-rojo/20"
                >
                  #{tag}
                </span>
              ))}
              {business.tags.length > 6 && (
                <span className="px-2.5 py-1 text-[11px] rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
                  +{business.tags.length - 6}
                </span>
              )}
            </div>
          </div>
        )}
      </section>
    </aside>
  );
};