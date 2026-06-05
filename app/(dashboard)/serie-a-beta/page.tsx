import { prisma } from "@/lib/db";
import Image from "next/image";
import { Trophy } from "lucide-react";

const BETA_ENDED = "Junho 2025";

const PODIUM_STYLE = [
  {
    row: "bg-yellow-400/12 border border-yellow-400/30 shadow-lg shadow-yellow-500/10",
    pts: "text-yellow-400",
    avatar: "ring-yellow-400/50",
    badge: "bg-yellow-500/20 text-yellow-200 border-yellow-400/40",
  },
  {
    row: "bg-slate-300/10 border border-slate-300/25",
    pts: "text-slate-300",
    avatar: "ring-slate-300/35",
    badge: "bg-slate-300/15 text-slate-200 border-slate-300/30",
  },
  {
    row: "bg-amber-700/12 border border-amber-600/25",
    pts: "text-amber-500",
    avatar: "ring-amber-600/35",
    badge: "bg-amber-700/20 text-amber-300 border-amber-600/30",
  },
];

const MEDAL = ["🥇", "🥈", "🥉"];
const BETA_LABEL = ["👑 Rei da Série A", "🥈 Vice da Série A", "🥉 3º da Série A"];

export default async function SerieABetaPage() {
  const entries = await prisma.betaRankingEntry.findMany({
    orderBy: { rank: "asc" },
    include: {
      user: { select: { id: true, name: true, image: true } },
    },
  });

  const top3 = entries.filter((e) => e.rank <= 3);
  const rest = entries.filter((e) => e.rank > 3);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 text-yellow-400/60 text-sm font-medium">
          <span>🧪</span>
          <span>Histórico encerrado em {BETA_ENDED}</span>
        </div>
        <h1 className="text-3xl font-black text-white">
          Hall da Fama Série A Beta
        </h1>
        <p className="text-white/40 text-sm max-w-sm mx-auto">
          Ranking final do beta teste — pontuação congelada.
        </p>
      </div>

      {/* Pódio top 3 */}
      {top3.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-white/30 uppercase tracking-wider flex items-center gap-2">
            <Trophy className="w-3.5 h-3.5" />
            Pódio
          </h2>
          {top3.map((entry) => {
            const podium = PODIUM_STYLE[entry.rank - 1];
            return (
              <div
                key={entry.userId}
                className={`flex items-center gap-3 p-4 rounded-xl ${podium.row}`}
              >
                <div className="text-2xl w-8 text-center flex-shrink-0">
                  {MEDAL[entry.rank - 1]}
                </div>
                {entry.user.image ? (
                  <Image
                    src={entry.user.image}
                    alt={entry.user.name ?? ""}
                    width={40}
                    height={40}
                    className={`rounded-full ring-2 flex-shrink-0 ${podium.avatar}`}
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/60 font-bold flex-shrink-0">
                    {entry.user.name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-white flex items-center gap-2 flex-wrap">
                    <span className="truncate">{entry.user.name ?? "Anônimo"}</span>
                    <span className={`text-[9px] font-bold border px-1.5 py-0.5 rounded-full whitespace-nowrap ${podium.badge}`}>
                      {BETA_LABEL[entry.rank - 1]}
                    </span>
                  </div>
                  <div className="text-xs text-white/40 mt-0.5">
                    {entry.exactScores} exato{entry.exactScores !== 1 ? "s" : ""} · {entry.correctWinners} certo{entry.correctWinners !== 1 ? "s" : ""}
                  </div>
                </div>
                <div className={`text-right flex-shrink-0 ${podium.pts}`}>
                  <div className="text-2xl font-black leading-none">{entry.totalPoints}</div>
                  <div className="text-xs text-white/30">pts</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Demais Pioneiros */}
      {rest.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-white/30 uppercase tracking-wider flex items-center gap-2">
            <span>🧪</span>
            Pioneiros da Série A
          </h2>
          {rest.map((entry) => (
            <div
              key={entry.userId}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/4 border border-white/8"
            >
              <div className="text-sm text-white/30 font-bold w-8 text-center flex-shrink-0">
                {entry.rank}º
              </div>
              {entry.user.image ? (
                <Image
                  src={entry.user.image}
                  alt={entry.user.name ?? ""}
                  width={32}
                  height={32}
                  className="rounded-full ring-1 ring-white/10 flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 font-bold text-xs flex-shrink-0">
                  {entry.user.name?.[0]?.toUpperCase() ?? "?"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-white text-sm flex items-center gap-2 flex-wrap">
                  <span className="truncate">{entry.user.name ?? "Anônimo"}</span>
                  <span className="text-[9px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-400/25 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                    🧪 Pioneiro Série A
                  </span>
                </div>
              </div>
              <div className="text-white/60 font-bold text-sm flex-shrink-0">
                {entry.totalPoints} <span className="text-white/25 font-normal text-xs">pts</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {entries.length === 0 && (
        <div className="text-center py-16 text-white/30">
          <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Ranking ainda não congelado.</p>
        </div>
      )}
    </div>
  );
}
