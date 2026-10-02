'use client';
import {createContext,useContext,useEffect,useState} from 'react';
import Link from './link';
import {usePathname} from 'next/navigation';
import {Sprout,LayoutDashboard,MessageSquare,Box,BookOpen,Layers,ArrowUpRight,Sun,Moon,PanelLeftClose,PanelLeftOpen} from 'lucide-react';
import {Sidebar,SidebarProvider,SidebarContent,SidebarHeader,SidebarFooter,SidebarMenu,SidebarMenuItem,SidebarMenuButton,useSidebar} from '@/components/ui/sidebar';

type Context={en:boolean;t:(zh:string,en:string)=>string;mode:string;dark:boolean};
const SiteContext=createContext<Context>({en:false,t:z=>z,mode:'loading',dark:false});
export const useSite=()=>useContext(SiteContext);
const nav=[{href:'/',zh:'工作台',en:'Workspace',icon:LayoutDashboard},{href:'/diagnosis',zh:'智能诊断',en:'Diagnosis',icon:MessageSquare},{href:'/roam',zh:'农机漫游',en:'3D explorer',icon:Box},{href:'/knowledge',zh:'知识库',en:'Knowledge',icon:BookOpen}];
function SidebarToggle(){const {toggleSidebar,open}=useSidebar();return <button className="icon-button sidebar-toggle" onClick={toggleSidebar} aria-label="展开或收起导航">{open?<PanelLeftClose size={18}/>:<PanelLeftOpen size={18}/>}</button>}
export function AppShell({children}:{children:React.ReactNode}){
 const pathname=usePathname();const [en,setEn]=useState(false);const [dark,setDark]=useState(false);const [mode,setMode]=useState('loading');
 const t=(zh:string,enText:string)=>en?enText:zh;
 useEffect(()=>{try{setEn(localStorage.getItem('sinong-lang')==='en');const saved=localStorage.getItem('sinong-theme');setDark(saved?saved==='dark':matchMedia('(prefers-color-scheme:dark)').matches);}catch{};fetch('/api/health').then(r=>{if(!r.ok)throw Error();return r.json()}).then(d=>setMode((d as {mode:string}).mode)).catch(()=>setMode('unavailable'));},[]);
 useEffect(()=>{document.documentElement.dataset.theme=dark?'dark':'light';},[dark]);
 useEffect(()=>{document.documentElement.lang=en?'en':'zh-CN';},[en]);
 const active=nav.find(n=>n.href===pathname);
 return <SiteContext.Provider value={{en,t,mode,dark}}><SidebarProvider style={{'--sidebar-width':'244px'} as React.CSSProperties}>
  <Sidebar className="sinong-sidebar" collapsible="offcanvas">
   <SidebarHeader className="brand-header"><Link href="/" className="brand"><span className="brand-mark"><Sprout size={27}/></span><span><strong>{t('耕知·耘诊','AgriDx')}</strong><small>SRT27 · AGRI INTELLIGENCE</small></span></Link></SidebarHeader>
   <SidebarContent className="side-content"><p className="nav-caption">{t('农机智能工作空间','YOUR WORKSPACE')}</p><SidebarMenu>{nav.map(n=><SidebarMenuItem key={n.href}><SidebarMenuButton asChild isActive={pathname===n.href} className="side-link"><Link href={n.href}><n.icon/><span>{t(n.zh,n.en)}</span>{n.href==='/diagnosis'&&<span className="nav-ai">AI</span>}</Link></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu>
   <div className="side-separator"/>
   <div className="side-note"><span className="side-note-symbol">田</span><p>{t('让经验有迹可循','Knowledge into practice.')}<br/>{t('让农机尽显其能','More from every machine.')}</p><span>AgriDx</span></div>
   </SidebarContent>
   <SidebarFooter className="side-footer"><a href="https://github.com/Changjie29/SRT27" target="_blank" rel="noreferrer"><span className="repo-icon"><Layers size={17}/></span><span><strong>SRT27</strong><small>{t('查看项目仓库','View source project')}</small></span><ArrowUpRight size={16}/></a><div className="university">{t('南京农业大学 · 创新实践项目','Nanjing Agricultural University')}</div></SidebarFooter>
  </Sidebar>
  <div className="app-main"><header className="topbar"><div className="breadcrumbs"><SidebarToggle/><span>SRT27</span><span className="slash">/</span><strong>{active?t(active.zh,active.en):t('工作台','Workspace')}</strong></div><div className="top-actions"><span className="top-status"><span className="status-dot"/>{t('知识库已就绪','Knowledge ready')}</span><button className="language-button" onClick={()=>{setEn(!en);try{localStorage.setItem('sinong-lang',!en?'en':'zh')}catch{}}} aria-label="切换中英文">{en?'中文':'EN'}</button><button className="icon-button" onClick={()=>{setDark(!dark);try{localStorage.setItem('sinong-theme',!dark?'dark':'light')}catch{}}} aria-label={t('切换明暗主题','Toggle theme')}>{dark?<Sun size={18}/>:<Moon size={18}/>}</button><span className="project-avatar">耕</span></div></header>
  <main className="page-content" id="main-content">{children}</main><footer className="page-footer"><span>© 2026 {t('耕知·耘诊','AgriDx')} · SRT27</span><span>{t('扎根农业 · 智启未来','Rooted in agriculture. Built for discovery.')}</span></footer></div>
 </SidebarProvider></SiteContext.Provider>
}
