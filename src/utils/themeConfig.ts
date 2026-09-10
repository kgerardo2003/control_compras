import { SystemThemeId } from '../types';

export interface ThemeConfig {
  id: SystemThemeId;
  name: string;
  tagline: string;
  description: string;
  sidebarBg: string;
  sidebarBorder: string;
  sidebarActive: string;
  sidebarHover: string;
  sidebarIconActive: string;
  sidebarBadge: string;
  primaryBtn: string;
  secondaryBtn: string;
  accentText: string;
  accentBorder: string;
  focusRing: string;
  dotColor: string;
  logoBadgeBg: string;
  logoBadgeText: string;
  appBackground?: string;
  preview: {
    sidebar: string;
    accent: string;
    surface: string;
    header: string;
  };
}

export const SYSTEM_THEMES: Record<SystemThemeId, ThemeConfig> = {
  azul_persia_acero: {
    id: 'azul_persia_acero',
    name: 'Azul Persia & Azul Acero',
    tagline: 'Paleta Oficial Institucional GIT',
    description: 'Armonía corporativa de Azul Persia (#1C39BB) y Azul Acero (#4682B4) con contraste óptimo y balance institucional.',
    sidebarBg: 'bg-[#0D1F4D]',
    sidebarBorder: 'border-[#1C39BB]/40',
    sidebarActive: 'bg-[#4682B4]/25 text-[#93C5FD] font-bold border-l-4 border-[#4682B4]',
    sidebarHover: 'hover:bg-[#162E7A] hover:text-white',
    sidebarIconActive: 'text-[#60A5FA]',
    sidebarBadge: 'bg-[#1C39BB] text-[#E0E7FF]',
    primaryBtn: 'bg-white hover:bg-slate-100 text-black border border-slate-300 shadow-sm font-bold cursor-pointer transition-all active:scale-[0.99]',
    secondaryBtn: 'bg-white hover:bg-slate-100 text-black border border-slate-200 shadow-xs font-semibold cursor-pointer transition-all active:scale-[0.99]',
    accentText: 'text-[#1C39BB]',
    accentBorder: 'border-[#4682B4]',
    focusRing: 'focus:ring-[#4682B4]',
    dotColor: 'bg-[#4682B4]',
    logoBadgeBg: 'bg-[#1C39BB]',
    logoBadgeText: 'text-white',
    appBackground: 'bg-[#F0F4F8]',
    preview: {
      sidebar: '#0D1F4D',
      accent: '#4682B4',
      surface: '#F0F4F8',
      header: '#1C39BB'
    }
  },
  slate_ambar: {
    id: 'slate_ambar',
    name: 'Profesional Pizarra & Ámbar',
    tagline: 'Tema Oficial Predeterminado',
    description: 'Diseño sobrio de alto contraste con laterales en gris pizarra profundo y botones de acción en ámbar dorado institucional.',
    sidebarBg: 'bg-slate-900',
    sidebarBorder: 'border-slate-800',
    sidebarActive: 'bg-amber-600/20 text-amber-400 font-bold',
    sidebarHover: 'hover:bg-slate-800 hover:text-white',
    sidebarIconActive: 'text-amber-400',
    sidebarBadge: 'bg-slate-800 text-slate-300',
    primaryBtn: 'bg-white hover:bg-slate-100 text-black border border-slate-300 shadow-sm font-bold cursor-pointer transition-all active:scale-[0.99]',
    secondaryBtn: 'bg-white hover:bg-slate-100 text-black border border-slate-200 shadow-xs font-semibold cursor-pointer transition-all active:scale-[0.99]',
    accentText: 'text-amber-600',
    accentBorder: 'border-amber-500',
    focusRing: 'focus:ring-amber-500',
    dotColor: 'bg-amber-500',
    logoBadgeBg: 'bg-amber-500',
    logoBadgeText: 'text-slate-950',
    preview: {
      sidebar: '#0f172a',
      accent: '#f59e0b',
      surface: '#f1f5f9',
      header: '#1e293b'
    }
  },
  azul_judicial: {
    id: 'azul_judicial',
    name: 'Azul Judicial Soberano',
    tagline: 'Corte Suprema y Tribunales',
    description: 'Paleta solemne inspirada en el Azul Marino Institucional del Organismo Judicial y detalles en oro republicano.',
    sidebarBg: 'bg-[#07243e]',
    sidebarBorder: 'border-[#0a3254]',
    sidebarActive: 'bg-amber-400/20 text-amber-300 font-bold border-l-2 border-amber-400',
    sidebarHover: 'hover:bg-[#0a3254] hover:text-white',
    sidebarIconActive: 'text-amber-300',
    sidebarBadge: 'bg-[#0a3254] text-sky-200',
    primaryBtn: 'bg-white hover:bg-slate-100 text-black border border-slate-300 shadow-sm font-bold cursor-pointer transition-all active:scale-[0.99]',
    secondaryBtn: 'bg-white hover:bg-slate-100 text-black border border-slate-200 shadow-xs font-semibold cursor-pointer transition-all active:scale-[0.99]',
    accentText: 'text-sky-700',
    accentBorder: 'border-sky-600',
    focusRing: 'focus:ring-sky-500',
    dotColor: 'bg-sky-500',
    logoBadgeBg: 'bg-[#C59B27]',
    logoBadgeText: 'text-[#07243e]',
    preview: {
      sidebar: '#07243e',
      accent: '#38bdf8',
      surface: '#f8fafc',
      header: '#0a3254'
    }
  },
  grafito_esmeralda: {
    id: 'grafito_esmeralda',
    name: 'Grafito & Esmeralda Jade',
    tagline: 'Modernidad Tecnológica GIT',
    description: 'Estilo contemporáneo con base grafito neutro y acentos en verde jade / esmeralda que evocan precisión e innovación.',
    sidebarBg: 'bg-zinc-900',
    sidebarBorder: 'border-zinc-800',
    sidebarActive: 'bg-emerald-500/20 text-emerald-400 font-bold',
    sidebarHover: 'hover:bg-zinc-800 hover:text-white',
    sidebarIconActive: 'text-emerald-400',
    sidebarBadge: 'bg-zinc-800 text-zinc-300',
    primaryBtn: 'bg-white hover:bg-slate-100 text-black border border-slate-300 shadow-sm font-bold cursor-pointer transition-all active:scale-[0.99]',
    secondaryBtn: 'bg-white hover:bg-slate-100 text-black border border-slate-200 shadow-xs font-semibold cursor-pointer transition-all active:scale-[0.99]',
    accentText: 'text-emerald-600',
    accentBorder: 'border-emerald-500',
    focusRing: 'focus:ring-emerald-500',
    dotColor: 'bg-emerald-500',
    logoBadgeBg: 'bg-emerald-600',
    logoBadgeText: 'text-white',
    preview: {
      sidebar: '#18181b',
      accent: '#10b981',
      surface: '#f4f4f5',
      header: '#27272a'
    }
  }
};
