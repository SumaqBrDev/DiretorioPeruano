import type { DisplayBusiness } from '@/lib/localData';

interface AboutSectionProps {
  business: DisplayBusiness;
}

export const AboutSection = ({ business }: AboutSectionProps) => {
  return (
    <section className="mb-12">
      <div className="bg-white dark:bg-noche-lima rounded-2xl shadow-lg p-8 border border-oro-inca/20">
        <h2 className="font-playfair text-2xl font-bold text-noche-lima dark:text-white mb-4">Sobre</h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{business.about}</p>
      </div>
    </section>
  );
};
