import React from 'react';
import { useApp } from '../context/AppContext';
import officialOjLogoAsset from '../assets/organismo_judicial_logo.svg';

interface OJLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  variant?: 'full' | 'icon' | 'badge';
  layout?: 'horizontal' | 'stacked';
  lightMode?: boolean;
  overrideLogo?: {
    type: 'preset' | 'custom_image';
    presetId?: 'oj_vector' | 'oj_monogram' | 'escudo_nacional';
    imageUrl?: string;
    title?: string;
    subtitle?: string;
  };
}

export const OJLogo: React.FC<OJLogoProps> = ({ 
  size = 'md', 
  variant = 'full',
  layout = 'stacked',
  lightMode = false,
  overrideLogo
}) => {
  const appContext = useApp();
  const officialEmblemUrl = officialOjLogoAsset || '/organismo_judicial_logo.svg';
  
  const activeLogo = overrideLogo || appContext?.customLogo || {
    type: 'custom_image',
    imageUrl: officialEmblemUrl,
    presetId: 'oj_vector',
    title: 'Organismo Judicial',
    subtitle: 'Gerencia de Informática'
  };

  const iconSizes = {
    sm: 'w-9 h-9',
    md: 'w-14 h-14',
    lg: 'w-20 h-20',
    xl: 'w-28 h-28',
    '2xl': 'w-36 h-36'
  };

  // Renderiza el gráfico del logo según tipo/preset
  const renderEmblem = () => {
    // 1. Preset: Monograma Heráldico OJ (solo si se selecciona explícitamente oj_monogram)
    if (activeLogo.type === 'preset' && activeLogo.presetId === 'oj_monogram') {
      return (
        <div 
          className={`${iconSizes[size]} relative rounded-lg flex items-center justify-center p-0.5 shadow-sm transition-transform duration-200 hover:scale-105`}
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            border: '2px solid #D4AF37'
          }}
        >
          <div className="w-full h-full rounded border border-amber-400/40 flex flex-col items-center justify-center bg-slate-950/60">
            <span className="font-extrabold tracking-widest text-amber-400 font-serif text-sm sm:text-base leading-none">
              OJ
            </span>
            <span className="text-[7px] text-sky-200 font-sans uppercase font-bold tracking-tighter mt-0.5">
              LEYES
            </span>
          </div>
        </div>
      );
    }

    // 2. Preset: Escudo Cívico Nacional (solo si se selecciona explícitamente escudo_nacional)
    if (activeLogo.type === 'preset' && activeLogo.presetId === 'escudo_nacional') {
      return (
        <div 
          className={`${iconSizes[size]} relative rounded-full flex items-center justify-center p-0.5 shadow-sm transition-transform duration-200 hover:scale-105`}
          style={{
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            border: '2px solid #F59E0B'
          }}
        >
          <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="46" fill="#0A3254" stroke="#F59E0B" strokeWidth="2" />
            <rect x="28" y="30" width="44" height="40" rx="3" fill="#FFFBEB" stroke="#D97706" strokeWidth="1.5" />
            <line x1="33" y1="40" x2="67" y2="40" stroke="#92400E" strokeWidth="1" />
            <line x1="33" y1="46" x2="67" y2="46" stroke="#92400E" strokeWidth="1" />
            <line x1="33" y1="52" x2="67" y2="52" stroke="#92400E" strokeWidth="1" />
            <line x1="33" y1="58" x2="55" y2="58" stroke="#92400E" strokeWidth="1" />
            <circle cx="48" cy="24" r="5" fill="#10B981" />
            <path d="M 44 26 C 42 34, 38 42, 34 50" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 52 25 L 56 24 L 52 27 Z" fill="#F59E0B" />
          </svg>
        </div>
      );
    }

    // 3. Emblema Oficial del Organismo Judicial de Guatemala (Logotipo Oficial de Wikimedia/Guatemala o personalizado)
    const effectiveImageUrl = activeLogo.imageUrl || officialEmblemUrl;

    return (
      <div 
        className={`${iconSizes[size]} relative rounded-2xl flex items-center justify-center p-1.5 transition-transform duration-200 hover:scale-105 flex-shrink-0 select-none overflow-hidden ${
          lightMode 
            ? 'bg-transparent' 
            : 'bg-white shadow-md border border-slate-200/80 ring-1 ring-slate-100'
        }`}
        title="Emblema Oficial - Organismo Judicial de Guatemala"
      >
        <img 
          src={effectiveImageUrl} 
          alt="Emblema Oficial Organismo Judicial de Guatemala" 
          className="w-full h-full object-contain drop-shadow-xs"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  };

  if (layout === 'stacked') {
    return (
      <div className="flex flex-col items-center text-center select-none w-full">
        {/* Emblema en Área Grande Superior */}
        <div className="flex items-center justify-center p-1 relative mb-2">
          {renderEmblem()}
        </div>

        {/* Texto Institucional Debajo del Emblema */}
        {variant !== 'icon' && (
          <div className="flex flex-col items-center max-w-full px-1">
            <span className={`font-bold tracking-wider uppercase text-xs sm:text-sm font-['Cinzel',serif] leading-tight ${lightMode ? 'text-slate-900' : 'text-white'}`}>
              {activeLogo.title || 'Organismo Judicial'}
            </span>
            <div className="flex items-center justify-center gap-1.5 my-0.5">
              <span className={`h-px w-4 ${lightMode ? 'bg-amber-600/40' : 'bg-amber-400/40'}`} />
              <span className={`text-[9px] uppercase font-bold tracking-widest ${lightMode ? 'text-amber-700' : 'text-amber-400'}`}>
                Guatemala, C.A.
              </span>
              <span className={`h-px w-4 ${lightMode ? 'bg-amber-600/40' : 'bg-amber-400/40'}`} />
            </div>
            <span className={`text-[10px] sm:text-[11px] font-medium tracking-tight leading-snug line-clamp-2 ${lightMode ? 'text-slate-600' : 'text-slate-300'}`}>
              {activeLogo.subtitle || 'Gerencia de Informática'}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 select-none">
      {renderEmblem()}

      {/* Texto Institucional */}
      {variant !== 'icon' && (
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`font-semibold tracking-wide uppercase text-xs sm:text-sm font-['Cinzel',serif] truncate ${lightMode ? 'text-slate-900' : 'text-white'}`}>
              {activeLogo.title || 'Organismo Judicial'}
            </span>
            <span className="hidden sm:inline-block px-1.5 py-0.2 text-[10px] uppercase font-bold tracking-wider rounded bg-amber-500/20 text-amber-300 border border-amber-400/40 flex-shrink-0">
              Guatemala
            </span>
          </div>
          <span className={`text-[11px] sm:text-xs font-medium tracking-normal truncate ${lightMode ? 'text-blue-900' : 'text-sky-200'}`}>
            {activeLogo.subtitle || 'Gerencia de Informática'}
          </span>
        </div>
      )}
    </div>
  );
};
