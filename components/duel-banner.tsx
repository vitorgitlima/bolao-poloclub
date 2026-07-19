import Image from "next/image";
import { cn } from "@/lib/utils";

type DuelEntry = {
  id: string;
  name: string | null;
  image: string | null;
  totalPoints: number;
};

function DuelSide({ entry, delayed }: { entry: DuelEntry; delayed: boolean }) {
  return (
    <div
      className={cn("duel-side flex-1 flex flex-col items-center gap-1.5 p-3 rounded-xl min-w-0")}
      style={{ animationDelay: delayed ? "-1s" : "0s" }}
    >
      {entry.image ? (
        <Image
          src={entry.image}
          alt={entry.name ?? ""}
          width={44}
          height={44}
          className="rounded-full"
        />
      ) : (
        <div className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center text-white/60 font-bold">
          {entry.name?.[0]?.toUpperCase() ?? "?"}
        </div>
      )}
      <span className="font-bold text-white text-sm truncate max-w-full">
        {entry.name ?? "Anônimo"}
      </span>
      <span className="text-xs text-white/40">{entry.totalPoints} pts</span>
    </div>
  );
}

export function DuelBanner({ top2 }: { top2: [DuelEntry, DuelEntry] | DuelEntry[] }) {
  const [a, b] = top2;
  return (
    <div className="glass-card p-4">
      <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3 text-center">
        🔥 Disputa pelo título
      </p>
      <div className="flex items-center gap-2">
        <DuelSide entry={a} delayed={false} />
        <span className="text-white/25 text-xs font-bold shrink-0">🆚</span>
        <DuelSide entry={b} delayed={true} />
      </div>
    </div>
  );
}
