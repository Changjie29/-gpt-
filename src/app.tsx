import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { LiquidGlassFilter } from '@sohumsuthar/liquid-glass';
import { useLiquidGlassEffects, Spotlight } from '@sohumsuthar/liquid-glass/hooks/useLiquidGlassEffects';
import displacementMap from '@/assets/lg-displacement.png?inline';
import '@sohumsuthar/liquid-glass/css/liquid-glass-core.css';
import '@sohumsuthar/liquid-glass/css/liquid-glass-effects.css';
const HomePage = lazy(() => import('@/pages/HomePage/HomePage'));
const ChatPage = lazy(() => import('@/pages/ChatPage/ChatPage'));
import NotFoundPage from '@/pages/NotFoundPage/NotFoundPage';

export default function App() {
  // 液态玻璃全局效果：光标高光跟随（--mx/--my/--lg-light-angle）、站点聚光、滚动显现
  useLiquidGlassEffects();
  return (
    <>
    <LiquidGlassFilter displacementMap={displacementMap} />
    <Spotlight />
    <Suspense fallback={<div role="status" className="p-8 text-center text-muted-foreground">加载中 / Loading…</div>}>
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="chat" element={<ChatPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    </Suspense>
    </>
  );
}
