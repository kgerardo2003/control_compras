import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { SYSTEM_THEMES, ThemeConfig } from '../utils/themeConfig';
import { SystemThemeId, CustomLogoConfig } from '../types';
import { OJLogo } from './OJLogo';
import { 
  Palette, 
  Image as ImageIcon, 
  Upload, 
  Link as LinkIcon, 
  RotateCcw, 
  CheckCircle2, 
  Sparkles, 
  Check, 
  Eye, 
  FileText, 
  Layers,
  Info,
  Shield,
  HelpCircle
} from 'lucide-react';

export const CustomizationView: React.FC = () => {
  const { 
    theme, 
    setTheme, 
    themeConfig, 
    customLogo, 
    setCustomLogo, 
    resetLogo,
    logAudit
  } = useApp();

  const [activeTab, setActiveTab] = useState<'themes' | 'logo'>('themes');
  const [urlInput, setUrlInput] = useState('');
  const [titleInput, setTitleInput] = useState(customLogo.title || 'Organismo Judicial');
  const [subtitleInput, setSubtitleInput] = useState(customLogo.subtitle || 'Gerencia de Informática');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  // Manejador de selección de tema
  const handleSelectTheme = (themeId: SystemThemeId) => {
    setTheme(themeId);
    logAudit('EDITAR_COMPRA', 'Sistema', `Tema visual cambiado a: ${SYSTEM_THEMES[themeId].name}`);
    showFeedback(`Tema "${SYSTEM_THEMES[themeId].name}" aplicado correctamente.`);
  };

  // Manejador de subida de archivo de imagen (drag & drop o file input)
  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showFeedback('El archivo seleccionado debe ser una imagen válida (PNG, JPG, SVG o WebP).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showFeedback('La imagen no debe exceder los 2MB de tamaño.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setCustomLogo({
          type: 'custom_image',
          imageUrl: result,
          title: titleInput,
          subtitle: subtitleInput
        });
        logAudit('EDITAR_COMPRA', 'Sistema', 'Logotipo institucional actualizado mediante archivo local.');
        showFeedback('Nuevo logotipo institucional cargado y aplicado exitosamente.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  // Manejador para aplicar URL
  const handleApplyUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    setCustomLogo({
      type: 'custom_image',
      imageUrl: urlInput.trim(),
      title: titleInput,
      subtitle: subtitleInput
    });
    setUrlInput('');
    logAudit('EDITAR_COMPRA', 'Sistema', 'Logotipo institucional actualizado mediante URL.');
    showFeedback('Logotipo por URL aplicado correctamente.');
  };

  // Manejador para seleccionar preset
  const handleSelectPreset = (presetId: 'oj_vector' | 'oj_monogram' | 'escudo_nacional') => {
    if (presetId === 'oj_vector') {
      setCustomLogo({
        type: 'custom_image',
        imageUrl: '/organismo_judicial_logo.svg',
        presetId: 'oj_vector',
        title: titleInput,
        subtitle: subtitleInput
      });
    } else {
      setCustomLogo({
        type: 'preset',
        presetId,
        title: titleInput,
        subtitle: subtitleInput
      });
    }
    logAudit('EDITAR_COMPRA', 'Sistema', `Emblema oficial cambiado a preset: ${presetId}`);
    showFeedback('Emblema oficial aplicado al sistema.');
  };

  // Guardar textos institucionales
  const handleSaveTexts = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomLogo(prev => ({
      ...prev,
      title: titleInput.trim() || 'Organismo Judicial',
      subtitle: subtitleInput.trim() || 'Gerencia de Informática'
    }));
    logAudit('EDITAR_COMPRA', 'Sistema', 'Títulos de logotipo institucional modificados.');
    showFeedback('Textos institucionales actualizados correctamente.');
  };

  const themeList = Object.values(SYSTEM_THEMES);

  return (
    <div className="space-y-6">
      
      {/* Encabezado del Módulo */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-600 uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Configuración & Identidad Institucional
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            Personalización de Logotipo y Temas Visuales
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Ajuste los colores del sistema entre las 3 opciones institucionales y configure el logotipo del Organismo Judicial.
          </p>
        </div>

        {/* Pestañas internas de navegación */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('themes')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'themes'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Palette className="w-3.5 h-3.5 text-amber-500" />
            <span>3 Opciones de Temas</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('logo')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'logo'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
            <span>Personalizar Logotipo</span>
          </button>
        </div>
      </div>

      {/* Alerta de Notificación Toast */}
      {feedbackMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-semibold flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setFeedbackMsg(null)}
            className="text-emerald-700 hover:text-emerald-950 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* CONTENIDO 1: OPCIONES DE TEMAS */}
      {activeTab === 'themes' && (
        <div className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {themeList.map((t: ThemeConfig) => {
              const isSelected = theme === t.id;

              return (
                <div
                  key={t.id}
                  id={`theme-card-${t.id}`}
                  onClick={() => handleSelectTheme(t.id)}
                  className={`cursor-pointer rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between bg-white relative ${
                    isSelected
                      ? 'border-amber-500 ring-2 ring-amber-400/40 shadow-md'
                      : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  {/* Badge de Activo */}
                  {isSelected && (
                    <div className="absolute top-3 right-3 z-10 px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black tracking-wider flex items-center gap-1 shadow-sm">
                      <Check className="w-3 h-3 stroke-[3]" />
                      <span>ACTIVO</span>
                    </div>
                  )}

                  {/* Previsualización Gráfica en Miniatura */}
                  <div className="p-4 bg-slate-50 border-b border-slate-200">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      {t.tagline}
                    </div>

                    {/* Maqueta Mini UI */}
                    <div className="h-28 rounded-xl overflow-hidden shadow-inner flex border border-slate-200/80">
                      {/* Sidebar Mini */}
                      <div 
                        className="w-20 p-2 flex flex-col justify-between"
                        style={{ backgroundColor: t.preview.sidebar }}
                      >
                        <div className="space-y-1.5">
                          <div 
                            className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-black text-white"
                            style={{ backgroundColor: t.preview.accent }}
                          >
                            OJ
                          </div>
                          <div className="h-1.5 w-10 bg-white/20 rounded-full" />
                          <div className="h-1.5 w-8 bg-white/20 rounded-full" />
                        </div>
                        
                        <div 
                          className="h-3 rounded flex items-center px-1"
                          style={{ backgroundColor: `${t.preview.accent}33` }}
                        >
                          <div 
                            className="w-1.5 h-1.5 rounded-full mr-1"
                            style={{ backgroundColor: t.preview.accent }}
                          />
                          <div className="h-1 w-6 bg-white/70 rounded" />
                        </div>
                      </div>

                      {/* Contenido Mini */}
                      <div className="flex-1 bg-white p-2.5 flex flex-col justify-between" style={{ backgroundColor: t.preview.surface }}>
                        <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60">
                          <div className="h-2 w-16 bg-slate-700 rounded-full" />
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: t.preview.accent }}
                          />
                        </div>

                        <div className="space-y-1.5 py-1">
                          <div className="h-5 rounded bg-white border border-slate-200 shadow-2xs p-1 flex items-center justify-between">
                            <div className="h-1.5 w-12 bg-slate-400 rounded" />
                            <div 
                              className="h-2 w-6 rounded text-[8px]"
                              style={{ backgroundColor: `${t.preview.accent}20` }}
                            />
                          </div>
                          <div className="h-5 rounded bg-white border border-slate-200 shadow-2xs p-1 flex items-center justify-between">
                            <div className="h-1.5 w-14 bg-slate-400 rounded" />
                            <div 
                              className="h-2 w-6 rounded text-[8px]"
                              style={{ backgroundColor: `${t.preview.accent}20` }}
                            />
                          </div>
                        </div>

                        {/* Botón Acción Mini */}
                        <div className="flex justify-end">
                          <div 
                            className="h-3.5 px-2 rounded flex items-center justify-center text-[8px] font-bold text-white shadow-2xs"
                            style={{ backgroundColor: t.preview.accent }}
                          >
                            + Evento
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Muestrario de Colores Hex */}
                    <div className="flex items-center gap-1.5 mt-3">
                      <span className="text-[10px] text-slate-400 font-semibold mr-1">Paleta:</span>
                      <span 
                        className="w-4 h-4 rounded-full border border-slate-300 shadow-2xs" 
                        style={{ backgroundColor: t.preview.sidebar }}
                        title={`Sidebar: ${t.preview.sidebar}`}
                      />
                      <span 
                        className="w-4 h-4 rounded-full border border-slate-300 shadow-2xs" 
                        style={{ backgroundColor: t.preview.accent }}
                        title={`Acento: ${t.preview.accent}`}
                      />
                      <span 
                        className="w-4 h-4 rounded-full border border-slate-300 shadow-2xs" 
                        style={{ backgroundColor: t.preview.surface }}
                        title={`Superficie: ${t.preview.surface}`}
                      />
                    </div>
                  </div>

                  {/* Descripción y Botón */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{t.name}</h3>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        {t.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSelectTheme(t.id)}
                      className={`mt-4 w-full py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                        isSelected
                          ? 'bg-[#1c39bb] text-white shadow-xs cursor-default'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                      }`}
                    >
                      {isSelected ? '✓ Tema Seleccionado' : 'Aplicar Este Tema'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Resumen del Tema Actualmente Aplicado */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-xs shadow-xs"
                style={{ backgroundColor: themeConfig.preview.accent }}
              >
                OJ
              </div>
              <div>
                <p className="font-bold text-slate-800">
                  Tema Activo: <span className="text-amber-700">{themeConfig.name}</span>
                </p>
                <p className="text-slate-500 text-[11px]">
                  El tema visual se almacena localmente y se mantiene activo en todas las vistas, modales y reportes.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleSelectTheme('slate_ambar')}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 font-bold text-black text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-black" />
              Restablecer Predeterminado
            </button>
          </div>

        </div>
      )}

      {/* CONTENIDO 2: PERSONALIZAR LOGOTIPO */}
      {activeTab === 'logo' && (
        <div className="space-y-6">
          
          {/* Card 1: Vista Previa en Vivo del Logotipo */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Eye className="w-4 h-4 text-amber-500" />
                  Previsualización en Vivo en Escenarios Reales
                </h3>
                <p className="text-xs text-slate-500">
                  Observe cómo se visualiza el logotipo actual en los diferentes entornos de la plataforma.
                </p>
              </div>

              <button
                type="button"
                onClick={resetLogo}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-black border border-slate-300 font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="Restaurar logotipo predeterminado del Organismo Judicial"
              >
                <RotateCcw className="w-3.5 h-3.5 text-black" />
                Restablecer Logotipo Oficial
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Escenario 1: Barra Lateral (Fondo Oscuro del Tema) */}
              <div className="p-4 rounded-xl border border-slate-700 flex flex-col justify-between" style={{ backgroundColor: themeConfig.preview.sidebar }}>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-3">
                  1. En Barra Lateral ({themeConfig.name})
                </span>
                <div className="py-2">
                  <OJLogo size="md" variant="full" lightMode={false} />
                </div>
                <span className="text-[10px] text-slate-400 mt-2">Visibilidad en menú de navegación</span>
              </div>

              {/* Escenario 2: Boleta o Reporte Oficial (Fondo Blanco Impreso) */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col justify-between shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-3">
                  2. En Boleta Imprimible (F56-e)
                </span>
                <div className="py-2 bg-slate-50/70 p-2 rounded-lg border border-slate-200">
                  <OJLogo size="md" variant="full" lightMode={true} />
                </div>
                <span className="text-[10px] text-slate-500 mt-2">Membrete institucional de dictámenes</span>
              </div>

              {/* Escenario 3: Modo Compacto / Icono en Barra Superior */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-3">
                  3. Emblema Compacto (Navbar)
                </span>
                <div className="py-2 flex items-center justify-center">
                  <OJLogo size="lg" variant="icon" />
                </div>
                <span className="text-[10px] text-slate-500 mt-2 text-center block">Icono en pestaña y avatar</span>
              </div>

            </div>
          </div>

          {/* Card 2: Métodos para Cambiar el Logotipo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Opción A: Subir Archivo Local de Imagen */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">Cargar Archivo de Logotipo</h4>
                  <p className="text-[11px] text-slate-500">Suba una imagen institucional desde su dispositivo</p>
                </div>
              </div>

              {/* Zona Drag & Drop */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-6 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  dragActive 
                    ? 'border-amber-500 bg-amber-50/50 scale-[1.01]' 
                    : 'border-slate-300 hover:border-amber-400 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/svg+xml, image/webp"
                  onChange={(e) => {
                    if (e.target.files?.[0]) processImageFile(e.target.files[0]);
                  }}
                  className="hidden"
                />
                <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mb-2">
                  <Upload className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-800">
                  Haga clic para seleccionar o arrastre una imagen aquí
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Formatos recomendados: PNG transparente, SVG o JPG (máx. 2MB)
                </p>
              </div>

              {/* Opción B: Ingresar URL Externa */}
              <div className="pt-2 border-t border-slate-100">
                <form onSubmit={handleApplyUrl} className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    O ingresar URL directa de la imagen:
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                        <LinkIcon className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type="url"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="https://ejemplo.gob.gt/logo-organismo-judicial.png"
                        className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!urlInput.trim()}
                      className="px-3.5 py-2 bg-white hover:bg-slate-100 text-black border border-slate-300 font-bold text-xs rounded-xl disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs cursor-pointer"
                    >
                      Cargar
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Opción C: Presets Oficiales del Organismo Judicial */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">Emblemas Vectoriales Oficiales</h4>
                  <p className="text-[11px] text-slate-500">Seleccione un escudo de la galería predeterminada del OJ</p>
                </div>
              </div>

              <div className="space-y-2.5">
                {/* Preset 1: Emblema Oficial Organismo Judicial */}
                <button
                  type="button"
                  onClick={() => handleSelectPreset('oj_vector')}
                  className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                    (customLogo.presetId === 'oj_vector' || (customLogo.type === 'custom_image' && customLogo.imageUrl?.includes('organismo_judicial_logo')))
                      ? 'border-amber-500 bg-amber-50/40 ring-1 ring-amber-400 font-bold'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shadow-xs">
                      <OJLogo size="sm" variant="icon" overrideLogo={{ type: 'custom_image', imageUrl: '/organismo_judicial_logo.svg', presetId: 'oj_vector', title: '', subtitle: '' }} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Emblema Oficial Organismo Judicial</p>
                      <p className="text-[11px] text-slate-500">Escudo Oficial de Armas: Quetzal, Fusiles, Espadas, Laureles y Pergamino C.A.</p>
                    </div>
                  </div>
                  {(customLogo.presetId === 'oj_vector' || (customLogo.type === 'custom_image' && customLogo.imageUrl?.includes('organismo_judicial_logo'))) && (
                    <CheckCircle2 className="w-4 h-4 text-amber-600" />
                  )}
                </button>

                {/* Preset 2: Monograma Escudo OJ */}
                <button
                  type="button"
                  onClick={() => handleSelectPreset('oj_monogram')}
                  className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                    customLogo.type === 'preset' && customLogo.presetId === 'oj_monogram'
                      ? 'border-amber-500 bg-amber-50/40 ring-1 ring-amber-400 font-bold'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-950 border border-amber-400 p-1 flex items-center justify-center">
                      <OJLogo size="sm" variant="icon" overrideLogo={{ type: 'preset', presetId: 'oj_monogram', title: '', subtitle: '' }} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Monograma Institucional OJ</p>
                      <p className="text-[11px] text-slate-500">Escudo compacto con siglas doradas y ribete</p>
                    </div>
                  </div>
                  {customLogo.type === 'preset' && customLogo.presetId === 'oj_monogram' && (
                    <CheckCircle2 className="w-4 h-4 text-amber-600" />
                  )}
                </button>

                {/* Preset 3: Escudo Nacional */}
                <button
                  type="button"
                  onClick={() => handleSelectPreset('escudo_nacional')}
                  className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                    customLogo.type === 'preset' && customLogo.presetId === 'escudo_nacional'
                      ? 'border-amber-500 bg-amber-50/40 ring-1 ring-amber-400 font-bold'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-sky-900 border border-amber-400 p-1 flex items-center justify-center">
                      <OJLogo size="sm" variant="icon" overrideLogo={{ type: 'preset', presetId: 'escudo_nacional', title: '', subtitle: '' }} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Escudo Nacional de Guatemala</p>
                      <p className="text-[11px] text-slate-500">Pergamino cívico "15 de Septiembre de 1821" y Quetzal</p>
                    </div>
                  </div>
                  {customLogo.type === 'preset' && customLogo.presetId === 'escudo_nacional' && (
                    <CheckCircle2 className="w-4 h-4 text-amber-600" />
                  )}
                </button>
              </div>

            </div>

          </div>

          {/* Card 3: Personalización de Textos Institucionales */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-600" />
              Rótulos & Títulos de la Institución
            </h4>

            <form onSubmit={handleSaveTexts} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Título Principal del Logotipo
                </label>
                <input
                  type="text"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  placeholder="Organismo Judicial"
                  className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Subtítulo / Dependencia
                </label>
                <input
                  type="text"
                  value={subtitleInput}
                  onChange={(e) => setSubtitleInput(e.target.value)}
                  placeholder="Gerencia de Informática"
                  className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="sm:col-span-2 flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-black border border-slate-300 font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer"
                >
                  Guardar Títulos del Logotipo
                </button>
              </div>
            </form>
          </div>

        </div>
      )}

    </div>
  );
};
