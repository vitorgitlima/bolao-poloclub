import Image from "next/image";
import { cn } from "@/lib/utils";

type DuelEntry = {
  id: string;
  name: string | null;
  image: string | null;
  totalPoints: number;
};

function DuelSide({ entry, side }: { entry: DuelEntry; side: "leader" | "chaser" }) {
  return (
    <div className={cn("duel-side flex-1 flex flex-col items-center gap-1.5 p-3 rounded-xl min-w-0", side)}>
      <div className={cn("duel-avatar-ring", side)}>
        {entry.image ? (
          <Image
            src={entry.image}
            alt={entry.name ?? ""}
            width={52}
            height={52}
            className="rounded-full"
          />
        ) : (
          <div className="w-[52px] h-[52px] rounded-full bg-white/10 flex items-center justify-center text-white/60 font-bold text-lg">
            {entry.name?.[0]?.toUpperCase() ?? "?"}
          </div>
        )}
      </div>
      <span className="font-extrabold text-white text-sm text-center truncate max-w-full">
        {entry.name ?? "Anônimo"}
      </span>
      <span className="text-lg font-black text-white leading-none tabular-nums">{entry.totalPoints}</span>
      <span className="text-[10px] text-white/35 uppercase tracking-wide">pontos</span>
    </div>
  );
}

export function DuelBanner({ top2 }: { top2: [DuelEntry, DuelEntry] | DuelEntry[] }) {
  const [a, b] = top2;
  const gap = Math.abs(a.totalPoints - b.totalPoints);
  return (
    <div className="glass-card p-4 duel-card">
      <div className="flex items-center justify-center gap-2 mb-3">
        <p className="text-xs font-bold text-white/55 uppercase tracking-wider">Disputa pelo título</p>
        <span className="live-dot" />
        <span className="text-[11px] font-extrabold text-red-400 uppercase tracking-wide">Ao vivo</span>
      </div>

      <div className="flex items-center gap-2">
        <DuelSide entry={a} side="leader" />
        <span className="duel-vs shrink-0">🆚</span>
        <DuelSide entry={b} side="chaser" />
      </div>

      {gap > 0 && (
        <p className="text-center text-xs text-white/45 mt-3">
          Falta{gap === 1 ? "" : "m"} <b className="text-yellow-400 font-extrabold">{gap} ponto{gap === 1 ? "" : "s"}</b> pra virar o jogo
        </p>
      )}
    </div>
  );
}
