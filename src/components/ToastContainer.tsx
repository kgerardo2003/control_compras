import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  Info, 
  AlertTriangle, 
  AlertCircle, 
  X, 
  FileCheck2,
  Download
} from 'lucide-react';
import { ToastItem, ToastType } from '../types';
import { useApp } from '../context/AppContext';

const TOAST_THEMES: Record<ToastType, {
  border: string;
  badgeBg: string;
  badgeText: string;
  progressColor: string;
  icon: React.ComponentType<{ className?: string }>;
}> = {
  success: {
    border: 'border-emerald-500/40',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    badgeText: 'text-emerald-700',
    progressColor: 'bg-emerald-500',
    icon: CheckCircle2,
  },
  info: {
    border: 'border-blue-500/40',
    badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
    badgeText: 'text-blue-700',
    progressColor: 'bg-blue-500',
    icon: Info,
  },
  warning: {
    border: 'border-amber-500/40',
    badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
    badgeText: 'text-amber-800',
    progressColor: 'bg-amber-500',
    icon: AlertTriangle,
  },
  error: {
    border: 'border-rose-500/40',
    badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
    badgeText: 'text-rose-700',
    progressColor: 'bg-rose-500',
    icon: AlertCircle,
  },
};

const ToastMessage: React.FC<{
  toast: ToastItem;
  onDismiss: (id: string) => void;
}> = ({ toast, onDismiss }) => {
  const duration = toast.duration ?? 4500;
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);

  const theme = TOAST_THEMES[toast.type] || TOAST_THEMES.info;
  const IconComponent = theme.icon;

  useEffect(() => {
    if (isPaused) return;

    const startTime = Date.now();
    const startProgress = progress;
    const remainingTime = (duration * startProgress) / 100;
    const endTime = startTime + remainingTime;

    const timer = setInterval(() => {
      const now = Date.now();
      const remaining = endTime - now;

      if (remaining <= 0) {
        clearInterval(timer);
        onDismiss(toast.id);
      } else {
        const remainingPercent = Math.max(0, (remaining / duration) * 100);
        setProgress(remainingPercent);
      }
    }, 50);

    return () => clearInterval(timer);
  }, [duration, isPaused, onDismiss, toast.id]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.92, x: 30 }}
      animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.9, x: 40, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`pointer-events-auto relative w-full max-w-sm rounded-xl bg-white shadow-xl border ${theme.border} overflow-hidden backdrop-blur-md`}
      role="alert"
    >
      {/* Barra de progreso de auto-cierre */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-slate-100">
        <div
          className={`h-full transition-all duration-75 ease-linear ${theme.progressColor}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="p-3.5 pt-4 flex items-start gap-3">
        {/* Ícono de estado con borde sutil */}
        <div className={`p-2 rounded-lg border shrink-0 ${theme.badgeBg}`}>
          <IconComponent className="w-4 h-4" />
        </div>

        {/* Contenido textual */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center justify-between gap-1">
            <h4 className="text-xs font-bold text-slate-900 leading-tight">
              {toast.title}
            </h4>
            <span className="text-[9px] font-mono text-slate-400 shrink-0">
              GIT-OJ
            </span>
          </div>
          {toast.message && (
            <p className="mt-1 text-xs text-slate-600 leading-relaxed break-words">
              {toast.message}
            </p>
          )}
        </div>

        {/* Botón de cierre manual */}
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
          title="Cerrar notificación"
          aria-label="Cerrar notificación"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useApp();

  return (
    <div
      id="system-toast-container"
      aria-live="polite"
      aria-atomic="true"
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3 sm:px-0"
    >
      <AnimatePresence mode="sync">
        {toasts.map((toast) => (
          <ToastMessage
            key={toast.id}
            toast={toast}
            onDismiss={dismissToast}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};
