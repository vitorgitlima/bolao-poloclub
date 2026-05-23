import { Trophy, Target, Check } from "lucide-react";
import Image from "next/image";

type RankingEntry = {
  id: string;
  name: string | null;
  image: string | null;
  totalPoints: number;
  exactScores: number;
  correctWinners: number;
  predictions: number;
};

const MEDAL = ["🥇", "🥈", "🥉"];

export function RankingTable({ data, currentUserId }: { data: RankingEntry[]; currentUserId?: string }) {
  if (data.length === 0) {
    return (
      <div className="text-center py-16 text-white/30">
        <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>Nenhum palpite pontuado ainda</p>
        <p className="text-sm mt-1">Aguarde os jogos terminarem!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {data.map((entry, idx) => {
        const isMe = entry.id === currentUserId;
        const isTop = idx === 0;

        return (
          <div
            key={entry.id}
            className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
              isMe
                ? "bg-green-500/15 border border-green-500/30"
                : isTop
                  ? "bg-yellow-400/10 border border-yellow-400/20"
                  : "bg-white/4 border border-white/8 hover:bg-white/7"
            }`}
          >
            <div className="text-2xl w-8 text-center flex-shrink-0">
              {MEDAL[idx] ?? <span className="text-white/40 font-bold text-sm">{idx + 1}º</span>}
            </div>

            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              {entry.image ? (
                <Image
                  src={entry.image}
                  alt={entry.name ?? ""}
                  width={36}
                  height={36}
                  className="rounded-full ring-2 ring-white/10 flex-shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 font-bold text-sm flex-shrink-0">
                  {entry.name?.[0]?.toUpperCase() ?? "?"}
                </div>
              )}
              <div className="min-w-0">
                <div className="font-bold text-white truncate text-sm">
                  {entry.name ?? "Anônimo"}
                  {isMe && <span className="ml-1.5 text-xs text-green-400 font-normal">(você)</span>}
                </div>
                <div className="text-xs text-white/40">
                  {entry.predictions} palpite{entry.predictions !== 1 ? "s" : ""}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="hidden sm:flex items-center gap-4 text-xs text-white/50">
              <div className="flex items-center gap-1" title="Placares exatos">
                <Target className="w-3 h-3 text-green-400" />
                {entry.exactScores}
              </div>
              <div className="flex items-center gap-1" title="Vencedores certos">
                <Check className="w-3 h-3 text-blue-400" />
                {entry.correctWinners}
              </div>
            </div>

            <div className={`text-right flex-shrink-0 ${isTop ? "text-yellow-400" : isMe ? "text-green-400" : "text-white"}`}>
              <div className="text-2xl font-black leading-none">{entry.totalPoints}</div>
              <div className="text-xs text-white/30">pts</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
