import type { DisplayBusiness } from '@/lib/localData';

interface HoursSectionProps {
  business: DisplayBusiness;
}

export const HoursSection = ({ business }: HoursSectionProps) => {
  return (
    <section className="mb-12">
      <div className="bg-white dark:bg-noche-lima rounded-2xl shadow-lg p-8 border border-oro-inca/20">
        <h2 className="font-playfair text-2xl font-bold text-noche-lima dark:text-white mb-4">Horário de Funcionamento</h2>
        <dl className="space-y-2">
          {business.hours.map((h, i) => (
            <div key={i} className="flex justify-between">
              <dt className="capitalize text-gray-700 dark:text-gray-300">{h.day}</dt>
              <dd className={`font-medium ${h.isOpen ? 'text-verde-brasil' : 'text-gray-500'}`}>{h.time}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
};
