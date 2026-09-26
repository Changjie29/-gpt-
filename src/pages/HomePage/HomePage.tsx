import HeroSection from './sections/HeroSection';
import PainPointsSection from './sections/PainPointsSection';
import MultimodalSection from './sections/MultimodalSection';
import ArchitectureSection from './sections/ArchitectureSection';
import SimulationSection from './sections/SimulationSection';
import TechRouteSection from './sections/TechRouteSection';
import ScenariosSection from './sections/ScenariosSection';
import ClosingSection from './sections/ClosingSection';
import SectionDivider from '@/components/SectionDivider';

export default function HomePage() {
  return (
    <div className="glass-home min-h-screen">
      <HeroSection />
      <SectionDivider variant="leaf" />
      <PainPointsSection />
      <SectionDivider variant="dots" />
      <MultimodalSection />
      <SectionDivider variant="leaf" />
      <ArchitectureSection />
      <SectionDivider variant="dots" />
      <SimulationSection />
      <SectionDivider variant="leaf" />
      <TechRouteSection />
      <SectionDivider variant="dots" />
      <ScenariosSection />
      <SectionDivider variant="line" />
      <ClosingSection />
    </div>
  );
}
