import { useTranslation } from 'react-i18next';
import { HeroSection } from '../components/HeroSection';
import { CommunityStats } from '../components/CommunityStats';
import { CategoryGrid } from '../components/CategoryGrid';
import { FeaturedBusinesses } from '../components/FeaturedBusinesses';
import { CommunityReviews } from '../components/CommunityReviews';
import { TestimonialsSection } from '../components/TestimonialsSection';
import { BusinessOwnerCTA } from '../components/BusinessOwnerCTA';

export const Home = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen">
      <HeroSection />
      <CommunityStats />
      <CategoryGrid />
      <FeaturedBusinesses />
      <CommunityReviews />
      <TestimonialsSection />
      <BusinessOwnerCTA />
    </div>
  );
};
