import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate, NavLink } from 'react-router-dom';
import { Menu, X, MessageSquare, Sun, Moon, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LiquidGlass } from '@sohumsuthar/liquid-glass';
import { cn } from '@/lib/utils';
import { useLang, setLang } from '@/hooks/useLang';

const NAV_ZH = [
  { label: '首页', path: '/' },
  { label: '多模态方案', hash: 'multimodal' },
  { label: '智能体架构', hash: 'architecture' },
  { label: '应用场景', hash: 'scenarios' },
];
const NAV_EN = [
  { label: 'Home', path: '/' },
  { label: 'Multimodal', hash: 'multimodal' },
  { label: 'Architecture', hash: 'architecture' },
  { label: 'Scenarios', hash: 'scenarios' },
];

export function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('srt-theme');
    if (saved === 'dark') return 'dark';
    if (saved === 'light') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const lang = useLang();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.classList.remove('theme-light', 'theme-dark');
    document.documentElement.classList.add(theme === 'dark' ? 'theme-dark' : 'theme-light');
    // 液态玻璃库使用 html.dark 切换暗色材质
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('srt-theme', theme);
  }, [theme]);

  const NAV_ITEMS = lang === 'zh' ? NAV_ZH : NAV_EN;
  const chatLabel = lang === 'zh' ? '智能体对话' : 'Agent Chat';

  const handleHashNav = (hash: string) => {
    setMobileOpen(false);
    if (location.pathname !== '/') {
      navigate(`/#${hash}`);
    } else {
      const el = document.getElementById(hash);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* 顶部导航栏 */}
      <header className="site-header sticky top-0 z-50 w-full">
        <LiquidGlass
          variant="regular"
          className="site-nav-glass"
          contentClassName="flex min-h-16 w-full items-center justify-between gap-2 px-3 md:px-5"
        >
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-2">
            <div className="glass-icon flex h-8 w-8 items-center justify-center text-primary transition-transform hover:scale-105">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2">
                <circle cx="7" cy="16" r="3" />
                <circle cx="17" cy="16" r="3" />
                <path d="M4 16V10l8-4 8 4v6" />
                <path d="M12 6v10" />
              </svg>
            </div>
            <span className="font-serif text-lg font-bold text-foreground">司农智机</span>
          </NavLink>

          {/* 桌面端导航 */}
          <nav className="hidden items-center gap-6 md:flex">
            {NAV_ITEMS.map((item) =>
              item.hash ? (
                <button
                  key={item.hash}
                  onClick={() => handleHashNav(item.hash!)}
                  className="group relative text-sm text-muted-foreground transition-colors hover:text-primary"
                >
                  {item.label}
                  <span className="absolute -bottom-1 left-0 h-0.5 w-0 rounded-full bg-primary transition-all duration-300 group-hover:w-full" />
                </button>
              ) : (
                <NavLink
                  key={item.path}
                  to={item.path!}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    cn(
                      'group relative text-sm transition-colors hover:text-primary',
                      isActive ? 'text-primary font-semibold' : 'text-muted-foreground',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {item.label}
                      <span
                        className={cn(
                          'absolute -bottom-1 left-0 h-0.5 rounded-full bg-primary transition-all duration-300',
                          isActive ? 'w-full' : 'w-0 group-hover:w-full',
                        )}
                      />
                    </>
                  )}
                </NavLink>
              ),
            )}
            <Button asChild size="sm" className="gap-1.5">
              <NavLink to="/chat">
                <MessageSquare className="h-4 w-4" />
                {chatLabel}
              </NavLink>
            </Button>
          </nav>

          {/* 右侧工具按钮（主题 + 语言 + 移动端菜单） */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-all hover:bg-accent hover:text-primary hover:scale-105"
              aria-label="切换主题"
              title={theme === 'dark' ? '切到亮色' : '切到暗色'}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
              className="flex h-9 items-center gap-1 rounded-full border border-border px-3 text-xs font-medium text-muted-foreground transition-all hover:bg-accent hover:text-primary hover:scale-105"
              aria-label="切换语言"
            >
              <Globe className="h-4 w-4" />
              {lang === 'zh' ? 'EN' : '中'}
            </button>
            <button
              className="flex h-9 w-9 items-center justify-center rounded-md border border-border md:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="菜单"
              aria-expanded={mobileOpen}
              aria-controls="mobile-navigation"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </LiquidGlass>

        {/* 移动端导航抽屉（非玻璃，避免玻璃嵌套失效） */}
        {mobileOpen && (
          <div id="mobile-navigation" className="mt-2 rounded-2xl border border-border/60 bg-card/90 shadow-lg backdrop-blur-xl md:hidden">
            <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
              {NAV_ITEMS.map((item) =>
                item.hash ? (
                  <button
                    key={item.hash}
                    onClick={() => handleHashNav(item.hash!)}
                    className="rounded-md px-3 py-2 text-left text-sm text-muted-foreground hover:bg-accent hover:text-primary"
                  >
                    {item.label}
                  </button>
                ) : (
                  <NavLink
                    key={item.path}
                    to={item.path!}
                    end={item.path === '/'}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'rounded-md px-3 py-2 text-sm transition-colors',
                        isActive ? 'bg-accent text-primary font-semibold' : 'text-muted-foreground hover:bg-accent hover:text-primary',
                      )
                    }
                  >
                    {item.label}
                  </NavLink>
                ),
              )}
              <Button asChild size="sm" className="mt-2 gap-1.5">
                <NavLink to="/chat" onClick={() => setMobileOpen(false)}>
                  <MessageSquare className="h-4 w-4" />
                  {chatLabel}
                </NavLink>
              </Button>
            </nav>
          </div>
        )}
      </header>

      {/* 主内容区 */}
      <main className="flex-1 w-full">
        <Outlet />
      </main>
    </div>
  );
}
