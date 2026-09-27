import HeroSection from './sections/HeroSection';
import PainPointsSection from './sections/PainPointsSection';
import MultimodalSection from './sections/MultimodalSection';
import ArchitectureSection from './sections/ArchitectureSection';
import SimulationSection from './sections/SimulationSection';
import TechRouteSection from './sections/TechRouteSection';
import ScenariosSection from './sections/ScenariosSection';
import ClosingSection from './sections/ClosingSection';
import { MotionConfig } from 'framer-motion';

export default function HomePage() {
  return (
    <MotionConfig reducedMotion="user"><div className="glass-home min-h-screen">
      <HeroSection />
      <PainPointsSection />
      <MultimodalSection />
      <ArchitectureSection />
      <SimulationSection />
      <TechRouteSection />
      <ScenariosSection />
      <ClosingSection />
    </div></MotionConfig>
  );
}
