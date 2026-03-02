import { useMemo, useState, type CSSProperties } from "react";

type Props = {
  appName?: string;
  subtitle?: string;
  onStart?: (recorderName: string) => void;
};

const ACCENT = "#002e6d";
const GOLD = "#c9a84c";

export default function HomeScreenStarter({
  appName = "Majestic",
  subtitle = "Temperature Log",
  onStart,
}: Props) {
  const [name, setName] = useState("");
  const [logoTap, setLogoTap] = useState(false);
  const [burstKey, setBurstKey] = useState(0);

  const stars = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => ({
        id: i,
        left: `${7 + ((i * 11) % 85)}%`,
        top: `${8 + ((i * 9) % 78)}%`,
        delay: `${i * 0.35}s`,
        duration: `${5 + (i % 4)}s`,
      })),
    [],
  );

  const tapBursts = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const angle = (Math.PI * 2 * i) / 12;
        const distance = 70 + (i % 4) * 12;
        return {
          id: i,
          tx: Math.round(Math.cos(angle) * distance),
          ty: Math.round(Math.sin(angle) * distance),
          rot: `${(i % 2 === 0 ? 1 : -1) * (90 + i * 15)}deg`,
          delay: `${i * 0.02}s`,
          color: i % 3 === 0 ? ACCENT : GOLD,
        };
      }),
    [],
  );

  const triggerLogoBurst = () => {
    setBurstKey((v) => v + 1);
    setLogoTap(true);
    window.setTimeout(() => setLogoTap(false), 480);
  };

  const start = () => {
    if (!name.trim()) return;
    onStart?.(name.trim());
  };

  return (
    <div className="relative z-10 overflow-hidden min-h-screen flex flex-col items-center justify-center px-4 py-8">
      {stars.map((star) => (
        <span
          key={star.id}
          className="home-star"
          style={{
            left: star.left,
            top: star.top,
            animationDelay: star.delay,
            animationDuration: star.duration,
          }}
        />
      ))}

      <div className="relative mb-6 animate-home-hero">
        <div className="home-orbit home-orbit-1" />
        <div className="home-orbit home-orbit-2" />

        <button
          type="button"
          onClick={triggerLogoBurst}
          className="animate-float rounded-full border-0 bg-transparent p-0 cursor-pointer"
          aria-label="Trigger logo animation"
        >
          <div
            className={`w-32 h-32 md:w-40 md:h-40 rounded-full home-logo ${logoTap ? "home-logo-tap" : ""}`}
            style={{
              background:
                "radial-gradient(circle at 30% 25%, #ffffff 0%, #f8edd0 35%, #dcbf75 60%, #002e6d 100%)",
              boxShadow: `0 12px 48px rgba(0,46,109,0.2), 0 0 0 4px ${GOLD}`,
            }}
          />
        </button>

        <div key={burstKey} className="absolute inset-0 pointer-events-none">
          {tapBursts.map((burst) => (
            <span
              key={burst.id}
              className="home-burst home-burst-tap confetti-particle"
              style={
                {
                  "--tx": `${burst.tx}px`,
                  "--ty": `${burst.ty}px`,
                  "--rot": burst.rot,
                  animationDelay: burst.delay,
                  background: burst.color,
                } as CSSProperties
              }
            />
          ))}
        </div>
      </div>

      <h1
        className="font-brand text-4xl md:text-5xl font-semibold tracking-[0.25em] uppercase animate-fade-in-down text-center"
        style={{ color: ACCENT }}
      >
        {appName}
      </h1>
      <div className="w-16 h-0.5 mx-auto my-2" style={{ background: GOLD }} />
      <p className="text-xs md:text-sm font-semibold tracking-[0.2em] uppercase animate-fade-in-down text-center" style={{ color: ACCENT }}>
        {subtitle}
      </p>

      <div className="w-full max-w-sm mt-8 animate-fade-in-up">
        <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-center tc-muted">
          Who's recording?
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && start()}
          className="w-full px-5 py-4 rounded-2xl text-center text-lg font-semibold outline-none transition-all glass-input"
          placeholder="Enter your name"
        />
      </div>

      <div className="mt-8 animate-fade-in-up">
        <button
          onClick={start}
          disabled={!name.trim()}
          className="px-10 py-4 rounded-2xl text-white text-lg font-bold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed btn-accent tracking-wide"
        >
          Start
        </button>
      </div>
    </div>
  );
}
