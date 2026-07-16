import { Business } from '@/data/mockBusinesses';

interface SidebarProps {
  business: Business;
}

export const Sidebar = ({ business }: SidebarProps) => {
  return (
    <aside className="lg:col-span-1 space-y-6">
      <section className="bg-white dark:bg-noche-lima rounded-2xl shadow-lg p-6 border border-oro-inca/20 space-y-4 sticky top-24">
        <h3 className="font-playfair text-xl font-bold text-noche-lima dark:text-white mb-4">Ações Rápidas</h3>
        <div className="space-y-3">
          <a href={`tel:${business.phone}`} className="block w-full bg-aji-rojo text-white py-3 rounded-xl font-semibold text-center hover:bg-aji-rojo/90 transition-colors flex items-center justify-center gap-2">
            <span>📞</span> Ligar
          </a>
          <a href={`https://wa.me/${business.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="block w-full bg-green-600 text-white py-3 rounded-xl font-semibold text-center hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
            <span>📱</span> WhatsApp
          </a>
          <a href={business.website} target="_blank" rel="noopener noreferrer" className="block w-full bg-oro-inca text-noche-lima py-3 rounded-xl font-semibold text-center hover:bg-oro-inca/90 transition-colors flex items-center justify-center gap-2">
            <span>🌐</span> Site
          </a>
          <a href={`mailto:${business.email}`} className="block w-full bg-creme-andino dark:bg-noche-lima border border-oro-inca/30 text-noche-lima dark:text-white py-3 rounded-xl font-semibold text-center hover:bg-oro-inca/10 transition-colors flex items-center justify-center gap-2">
            <span>✉️</span> Email
          </a>
        </div>
      </section>
    </aside>
  );
};
