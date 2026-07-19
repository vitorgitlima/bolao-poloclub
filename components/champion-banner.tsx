import Image from "next/image";
import { Trophy } from "lucide-react";

type ChampionEntry = {
  id: string;
  name: string | null;
  image: string | null;
  totalPoints: number;
};

export function ChampionBanner({ champion }: { champion: ChampionEntry }) {
  return (
    <div className="glass-card p-5 text-center champion-glow overflow-hidden relative">
      <Trophy className="w-10 h-10 mx-auto mb-2 text-yellow-400" />
      <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
        Campeã da Liga
      </p>
      <div className="flex items-center justify-center gap-3">
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
      <p className="text-white/40 text-sm mt-2">{champion.totalPoints} pts</p>
    </div>
  );
}
