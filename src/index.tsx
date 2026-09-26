import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './app';
import './index.css';
import './tailwind-theme.css';
import './typography.css';
import './liquid-glass.css';

// 浏览器刷新时回到首页；站内跳转和直接打开对话链接仍按正常路由处理。
const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
if (navigation?.type === 'reload') {
  window.history.replaceState(null, '', import.meta.env.BASE_URL);
}

/* ===== ResizeObserver 兜底 =====
 * 某些浏览器/嵌入环境下原生 ResizeObserver 不触发回调，导致
 * react-three-fiber 的 Canvas 拿不到容器尺寸（恒为 0x0）而永不初始化。
 * 这里先自检：视口内观察元素 ~350ms 无回调即判定原生 RO 失效，
 * 用 rAF 轮询 getBoundingClientRect 的轻量实现兜底。原生 RO 正常时不产生任何影响。 */
(function installResizeObserverFallback() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  class ROPolyfill {
    constructor(cb: (entries: ResizeObserverEntry[]) => void) {
      this.cb = cb;
      this.targets = new Map<Element, { width: number; height: number }>();
      this.raf = 0;
    }
    cb: (entries: ResizeObserverEntry[]) => void;
    targets: Map<Element, { width: number; height: number }>;
    raf: number;
    observe(el: Element) {
      const r = el.getBoundingClientRect();
      this.targets.set(el, { width: r.width, height: r.height });
      if (this.raf === 0) this.loop();
    }
    unobserve(el: Element) {
      this.targets.delete(el);
    }
    disconnect() {
      this.targets.clear();
      if (this.raf) cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
    loop = () => {
      const entries: ResizeObserverEntry[] = [];
      for (const [el, last] of this.targets) {
        const r = el.getBoundingClientRect();
        if (r.width !== last.width || r.height !== last.height) {
          this.targets.set(el, { width: r.width, height: r.height });
          entries.push({ target: el, contentRect: r } as ResizeObserverEntry);
        }
      }
      if (entries.length) this.cb(entries);
      this.raf = this.targets.size ? requestAnimationFrame(this.loop) : 0;
    };
  }

  const NativeRO = window.ResizeObserver;
  if (typeof NativeRO !== 'function') {
    window.ResizeObserver = ROPolyfill as unknown as typeof ResizeObserver;
    return;
  }
  // 自检：视口内元素，排除离屏不触发因素
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;top:4px;left:4px;width:10px;height:10px;opacity:0.01;pointer-events:none;z-index:-1';
  document.body.appendChild(probe);
  let fired = false;
  const ro = new NativeRO(() => {
    fired = true;
  });
  ro.observe(probe);
  setTimeout(() => {
    ro.disconnect();
    probe.remove();
    if (!fired) {
      window.ResizeObserver = ROPolyfill as unknown as typeof ResizeObserver;
    }
  }, 350);
})();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
