import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { RankingTable } from "@/components/ranking-table";
import { Trophy, Zap, Target, Check } from "lucide-react";

export const dynamic = "force-dynamic";

async function getRanking() {
  const users = await prisma.user.findMany({
    include: {
      predictions: {
        select: { points: true, isDoublePoints: true },
      },
    },
  });

  return users
    .map((user) => ({
      id: user.id,
      name: user.name,
      image: user.image,
      totalPoints: user.predictions.reduce((sum, p) => sum + (p.points ?? 0), 0),
      exactScores: user.predictions.filter((p) =>
        p.isDoublePoints ? (p.points ?? 0) === 12 : (p.points ?? 0) === 6
      ).length,
      correctWinners: user.predictions.filter((p) =>
        p.isDoublePoints
          ? (p.points ?? 0) === 6 || (p.points ?? 0) === 8
          : (p.points ?? 0) === 3 || (p.points ?? 0) === 4
      ).length,
      predictions: user.predictions.length,
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints);
}

export default async function RankingPage() {
  const session = await auth();
  const ranking = await getRanking();
  const myPosition = ranking.findIndex((r) => r.id === session?.user?.id) + 1;
  const me = ranking.find((r) => r.id === session?.user?.id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-yellow-400/15 rounded-xl">
            <Trophy className="w-7 h-7 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Ranking</h1>
            <p className="text-white/40 text-sm">
              {myPosition > 0
                ? `Você está em ${myPosition}º lugar`
                : "Faça palpites para aparecer!"}
            </p>
          </div>
        </div>

        {/* Meus stats */}
        {me && (
          <div className="grid grid-cols-3 gap-2 mt-2 pt-4 border-t border-white/8">
            <div className="text-center">
              <div className="text-xl font-black text-yellow-400">{me.totalPoints}</div>
              <div className="text-white/30 text-xs">meus pontos</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-black text-green-400">{me.exactScores}</div>
              <div className="text-white/30 text-xs">exatos</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-black text-blue-400">{me.correctWinners}</div>
              <div className="text-white/30 text-xs">vencedores</div>
            </div>
          </div>
        )}
      </div>

      {/* Ranking */}
      <div className="glass-card p-4">
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4 flex items-center gap-2">
          🏆 Classificação Geral
          <span className="text-white/30 font-normal normal-case tracking-normal">
            · {ranking.length} participante{ranking.length !== 1 ? "s" : ""}
          </span>
        </h2>
        <RankingTable data={ranking} currentUserId={session?.user?.id} />
      </div>

      {/* Legenda */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: <Target className="w-4 h-4" />, label: "Placar exato", pts: "6 pts", color: "text-green-400", bg: "bg-green-400/10" },
          { icon: <Check className="w-4 h-4" />, label: "Saldo de gols", pts: "4 pts", color: "text-purple-400", bg: "bg-purple-400/10" },
          { icon: <Check className="w-4 h-4" />, label: "Vencedor certo", pts: "3 pts", color: "text-blue-400", bg: "bg-blue-400/10" },
          { icon: <Zap className="w-4 h-4" />, label: "Double Points", pts: "×2 tudo", color: "text-yellow-400", bg: "bg-yellow-400/10" },
        ].map((item) => (
          <div key={item.label} className={`glass-card p-3 text-center ${item.bg} border-0`}>
            <div className={`flex justify-center mb-1 ${item.color}`}>{item.icon}</div>
            <div className="text-white/40 text-[10px] mb-0.5">{item.label}</div>
            <div className={`font-bold text-sm ${item.color}`}>{item.pts}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
