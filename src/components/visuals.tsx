import { useMemo, useEffect } from 'react';
import type React from 'react';
import { ACCENT, GOLD, CONFETTI_COLORS } from '../types';

export const AuroraBackground = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
    <div className="aurora-orb aurora-orb-1" />
    <div className="aurora-orb aurora-orb-2" />
    <div className="aurora-orb aurora-orb-3" />
    <div className="aurora-orb aurora-orb-4" />
  </div>
);

export const IceCrystals = () => {
  const c = useMemo(() => Array.from({ length: 14 }, (_, i) => ({
    id: i, left: Math.random() * 100, dur: 10 + Math.random() * 12, del: Math.random() * 15,
    size: 12 + Math.random() * 18, opacity: 0.05 + Math.random() * 0.12, shape: i % 4,
  })), []);
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {c.map(x => (
        <div key={x.id} className="absolute animate-crystal-fall"
          style={{ left: `${x.left}%`, '--dur': `${x.dur}s`, '--del': `${x.del}s` } as React.CSSProperties}>
          <svg width={x.size} height={x.size} viewBox="0 0 24 24" style={{ opacity: x.opacity }}>
            {x.shape === 0 && <polygon points="12,1 15,9 23,9 17,14 19,22 12,17 5,22 7,14 1,9 9,9" fill="none" stroke="rgba(0,46,109,0.4)" strokeWidth="0.6" />}
            {x.shape === 1 && <polygon points="12,2 22,12 12,22 2,12" fill="none" stroke="rgba(201,168,76,0.35)" strokeWidth="0.6" />}
            {x.shape === 2 && <polygon points="12,2 21,7 21,17 12,22 3,17 3,7" fill="none" stroke="rgba(0,46,109,0.35)" strokeWidth="0.6" />}
            {x.shape === 3 && <circle cx="12" cy="12" r="8" fill="none" stroke="rgba(201,168,76,0.25)" strokeWidth="0.5" />}
          </svg>
        </div>
      ))}
    </div>
  );
};

export const ThermometerHero = ({ size = 150, className = '' }: { size?: number; className?: string }) => (
  <svg viewBox="0 0 80 160" width={size * 0.5} height={size} className={className}>
    <defs>
      <linearGradient id="mercury" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%" stopColor="#c9a84c" /><stop offset="50%" stopColor="#002e6d" /><stop offset="100%" stopColor="#001a3f" />
      </linearGradient>
      <linearGradient id="thermBody" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="rgba(0,46,109,0.12)" /><stop offset="100%" stopColor="rgba(201,168,76,0.08)" />
      </linearGradient>
      <filter id="mercuryGlow"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
    </defs>
    <rect x="28" y="10" width="24" height="108" rx="12" fill="url(#thermBody)" stroke="rgba(0,46,109,0.2)" strokeWidth="1" />
    <circle cx="40" cy="130" r="18" fill="url(#thermBody)" stroke="rgba(0,46,109,0.2)" strokeWidth="1" />
    <circle cx="40" cy="130" r="12" fill="url(#mercury)" filter="url(#mercuryGlow)" opacity="0.85">
      <animate attributeName="r" values="11;13;11" dur="2.5s" repeatCount="indefinite" />
    </circle>
    <rect x="36" y="42" width="8" height="80" rx="4" fill="url(#mercury)" opacity="0.75">
      <animate attributeName="y" values="62;42;55;42" dur="5s" repeatCount="indefinite" />
      <animate attributeName="height" values="60;80;67;80" dur="5s" repeatCount="indefinite" />
    </rect>
    {[30, 50, 70, 90, 110].map(y => <line key={y} x1="23" y1={y} x2="28" y2={y} stroke="rgba(0,46,109,0.2)" strokeWidth="0.8" />)}
  </svg>
);

export const FridgeIllustration = ({ size = 130, className = '' }: { size?: number; className?: string }) => (
  <svg viewBox="0 0 100 140" width={size} height={size * 1.4} className={className}>
    <defs>
      <linearGradient id="fbody" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0%" stopColor="#d4dff0" /><stop offset="100%" stopColor="#bcc8dc" /></linearGradient>
      <linearGradient id="ffreezer" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#002e6d" /><stop offset="100%" stopColor="#001a3f" /></linearGradient>
      <linearGradient id="fglass" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="rgba(255,255,255,0.5)" /><stop offset="50%" stopColor="rgba(255,255,255,0.15)" /><stop offset="100%" stopColor="rgba(255,255,255,0.3)" /></linearGradient>
      <filter id="fshadow"><feDropShadow dx="0" dy="5" stdDeviation="6" floodColor="#002e6d" floodOpacity="0.15" /></filter>
    </defs>
    <rect x="12" y="5" width="76" height="130" rx="8" fill="url(#fbody)" filter="url(#fshadow)" stroke="#7a8eaa" strokeWidth="1" />
    <rect x="12" y="5" width="76" height="40" rx="8" fill="url(#ffreezer)" stroke="#002e6d" strokeWidth="1" />
    <rect x="16" y="50" width="68" height="80" rx="5" fill="url(#fglass)" />
    <rect x="76" y="20" width="3" height="14" rx="1.5" fill="#c9a84c" opacity="0.7" />
    <rect x="76" y="65" width="3" height="28" rx="1.5" fill="#c9a84c" opacity="0.5" />
    <line x1="18" y1="82" x2="82" y2="82" stroke="#7a8eaa" strokeWidth="0.5" opacity="0.3" />
    <line x1="18" y1="110" x2="82" y2="110" stroke="#7a8eaa" strokeWidth="0.5" opacity="0.3" />
    <rect x="22" y="55" width="14" height="22" rx="4" fill="#002e6d" opacity="0.2" />
    <rect x="40" y="60" width="10" height="17" rx="3" fill="#c9a84c" opacity="0.25" />
    <circle cx="36" cy="96" r="7" fill="#86efac" opacity="0.3" />
    <circle cx="58" cy="92" r="5.5" fill="#67e8f9" opacity="0.25" />
    <rect x="26" y="115" width="16" height="13" rx="3" fill="#c9a84c" opacity="0.2" />
    <rect x="50" y="117" width="12" height="11" rx="3" fill="#002e6d" opacity="0.15" />
    <circle cx="30" cy="24" r="2.5" fill="white" opacity="0.35" /><circle cx="50" cy="18" r="1.5" fill="white" opacity="0.25" />
    <circle cx="66" cy="27" r="2" fill="#c9a84c" opacity="0.3" /><circle cx="43" cy="30" r="1" fill="white" opacity="0.2" />
  </svg>
);

export const ColdVapor = () => (
  <div className="flex justify-center gap-3 pointer-events-none">
    {[0, 1, 2, 3, 4].map(i => (
      <div key={i} className="vapor-particle" style={{ animationDelay: `${i * 0.5}s` }}>
        <div className="w-10 h-2 rounded-full blur-sm" style={{ background: 'rgba(0,46,109,0.08)' }} />
      </div>
    ))}
  </div>
);

export const SuccessCheck = ({ size = 110 }: { size?: number }) => (
  <div className="relative" style={{ width: size, height: size }}>
    <div className="absolute inset-0 rounded-full animate-burst-1" style={{ border: `3px solid rgba(0,46,109,0.2)` }} />
    <div className="absolute inset-0 rounded-full animate-burst-2" style={{ border: `2px solid ${GOLD}40` }} />
    <svg viewBox="0 0 100 100" width={size} height={size}>
      <circle cx="50" cy="50" r="38" fill="none" stroke={ACCENT} strokeWidth="3" className="animate-draw-circle" />
      <path d="M30 52 L44 66 L72 34" fill="none" stroke={GOLD} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" className="animate-draw-check" />
    </svg>
  </div>
);

export const CelebrationOverlay = ({ onDone }: { onDone: () => void }) => {
  const particles = useMemo(() =>
    Array.from({ length: 36 }, (_, i) => {
      const rad = ((i / 36) * 360 * Math.PI) / 180;
      const dist = 90 + Math.random() * 180;
      return { id: i, color: CONFETTI_COLORS[i % CONFETTI_COLORS.length], tx: Math.cos(rad) * dist, ty: Math.sin(rad) * dist, size: 5 + Math.random() * 7, delay: Math.random() * 250, rot: Math.random() * 720 };
    }), []);
  useEffect(() => { const t = setTimeout(onDone, 3200); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 animate-fade-in pointer-events-none">
      <div className="relative">
        {particles.map(p => (
          <div key={p.id} className="absolute confetti-particle rounded-sm"
            style={{ width: p.size, height: p.size * 0.55, background: p.color, left: '50%', top: '50%',
              '--tx': `${p.tx}px`, '--ty': `${p.ty}px`, '--rot': `${p.rot}deg`, animationDelay: `${p.delay}ms`,
            } as React.CSSProperties} />
        ))}
        <div className="animate-pop-in"><SuccessCheck size={110} /></div>
      </div>
    </div>
  );
};
