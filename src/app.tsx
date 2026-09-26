import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { LiquidGlassFilter } from '@sohumsuthar/liquid-glass';
import displacementMap from '@/assets/lg-displacement.png?inline';
import '@sohumsuthar/liquid-glass/css/liquid-glass-core.css';
const HomePage = lazy(() => import('@/pages/HomePage/HomePage'));
const ChatPage = lazy(() => import('@/pages/ChatPage/ChatPage'));
import NotFoundPage from '@/pages/NotFoundPage/NotFoundPage';

export default function App() {
  return (
    <>
    <LiquidGlassFilter displacementMap={displacementMap} />
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
