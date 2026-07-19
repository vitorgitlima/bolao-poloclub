import Image from "next/image";
import { Trophy } from "lucide-react";

type ChampionEntry = {
  id: string;
  name: string | null;
  image: string | null;
  totalPoints: number;
};

const CONFETTI = [
  { left: "6%", color: "#fbbf24", duration: "5.2s", delay: "-1s" },
  { left: "16%", color: "#16a34a", duration: "6.1s", delay: "-3s" },
  { left: "27%", color: "#f1f5f9", duration: "4.6s", delay: "-2s" },
  { left: "38%", color: "#f59e0b", duration: "5.8s", delay: "-0.5s" },
  { left: "49%", color: "#16a34a", duration: "5s", delay: "-4s" },
  { left: "60%", color: "#fbbf24", duration: "6.4s", delay: "-1.5s" },
  { left: "71%", color: "#f1f5f9", duration: "4.9s", delay: "-3.5s" },
  { left: "82%", color: "#16a34a", duration: "5.6s", delay: "-2.5s" },
  { left: "92%", color: "#f59e0b", duration: "6s", delay: "-0.8s" },
];

function Confetti() {
  return (
    <div className="confetti-layer" aria-hidden="true">
      {CONFETTI.map((c, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: c.left,
            background: c.color,
            animationDuration: c.duration,
            animationDelay: c.delay,
          }}
        />
      ))}
    </div>
  );
}

export function ChampionBanner({ champion }: { champion: ChampionEntry }) {
  return (
    <div className="glass-card p-5 text-center champion-glow overflow-hidden relative">
      <Confetti />
      <Trophy className="w-10 h-10 mx-auto mb-2 text-yellow-400 relative" />
      <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 relative">
        Campeã da Liga
      </p>
      <div className="flex items-center justify-center gap-3 relative">
        {champion.image ? (
          <Image
            src={champion.image}
            alt={champion.name ?? ""}
            width={48}
            height={48}
            className="rounded-full ring-2 ring-yellow-400/60"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white/60 font-bold ring-2 ring-yellow-400/60">
            {champion.name?.[0]?.toUpperCase() ?? "?"}
          </div>
        )}
        <span className="copa-gradient text-2xl font-black">
          {champion.name ?? "Anônimo"}
        </span>
      </div>
      <p className="text-white/40 text-sm mt-2 relative">{champion.totalPoints} pts</p>
    </div>
  );
}
