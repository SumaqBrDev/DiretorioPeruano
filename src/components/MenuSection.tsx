import type { DisplayBusiness } from '@/lib/localData';

interface MenuSectionProps {
  business: DisplayBusiness;
}

export const MenuSection = ({ business }: MenuSectionProps) => {
  const totalItems = business.menu.reduce((sum, category) => sum + category.items.length, 0);

  return (
    <section className="mb-12">
      <div className="bg-white dark:bg-noche-lima rounded-2xl shadow-lg p-8 border border-oro-inca/20">
        <header className="flex items-center justify-between mb-8">
          <h2 className="font-playfair text-2xl font-bold text-noche-lima dark:text-white">Cardápio</h2>
          <span className="bg-aji-rojo/10 text-aji-rojo px-3 py-1 rounded-full text-sm font-medium">{totalItems} itens</span>
        </header>
        <div className="space-y-8">
          {business.menu.map((category, catIndex) => (
            <div key={catIndex} className="space-y-4">
              <h3 className="font-playfair text-xl font-bold text-noche-lima dark:text-white border-b border-oro-inca/20 pb-2 mb-4">{category.category}</h3>
              <div className="space-y-4">
                {category.items.map((item, itemIndex) => (
                  <div key={itemIndex} className="flex items-center justify-between py-3 border-b border-oro-inca/20 last:border-0 group">
                    <div>
                      <h4 className="font-medium text-noche-lima dark:text-white group-hover:text-aji-rojo transition-colors">{item.name}</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{item.description}</p>
                    </div>
                    <span className="font-bold text-aji-rojo text-lg">{item.price}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
