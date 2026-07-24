import type { DisplayBusiness } from '@/lib/localData';

interface ContactInfoSectionProps {
  business: DisplayBusiness;
}

export const ContactInfoSection = ({ business }: ContactInfoSectionProps) => {
  return (
    <section className="mb-12">
      <div className="bg-white dark:bg-noche-lima rounded-2xl shadow-lg p-8 border border-oro-inca/20">
        <h2 className="font-playfair text-2xl font-bold text-noche-lima dark:text-white mb-4">Contato</h2>
        <dl className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📍</span>
            <dd className="text-gray-700 dark:text-gray-300">{business.address}, {business.city}</dd>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl">📞</span>
            <dd className="text-gray-700 dark:text-gray-300"><a href={`tel:${business.phone}`} className="hover:text-aji-rojo">{business.phone}</a></dd>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl">📱</span>
            <dd className="text-gray-700 dark:text-gray-300"><a href={`https://wa.me/${business.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="hover:text-green-600">{business.whatsapp}</a></dd>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl">✉️</span>
            <dd className="text-gray-700 dark:text-gray-300"><a href={`mailto:${business.email}`} className="hover:text-aji-rojo">{business.email}</a></dd>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌐</span>
            <dd className="text-gray-700 dark:text-gray-300"><a href={business.website} target="_blank" rel="noopener noreferrer" className="hover:text-aji-rojo">{business.website}</a></dd>
          </div>
        </dl>
      </div>
    </section>
  );
};
