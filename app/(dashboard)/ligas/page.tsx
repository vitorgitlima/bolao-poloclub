import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { Users, Plus, Crown, Trophy, ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LigasPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const leagues = await prisma.league.findMany({
    where: {
      OR: [
        { ownerId: session.user.id },
        { members: { some: { userId: session.user.id } } },
      ],
    },
    include: {
      owner: { select: { id: true, name: true, image: true } },
      _count: { select: { members: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const ownedCount = leagues.filter((l) => l.ownerId === session.user.id).length;

  return (
    <div className="space-y-5 max-w-2xl w-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            Minhas Ligas
          </h1>
          <p className="text-white/40 text-xs sm:text-sm mt-0.5">
            Dispute com seus amigos em ligas privadas
          </p>
        </div>
        {ownedCount < 5 && (
          <Link
            href="/ligas/criar"
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Criar Liga</span>
          </Link>
        )}
      </div>

      {leagues.length === 0 ? (
        <div className="glass-card p-8 sm:p-10 flex flex-col items-center text-center gap-4">
          <div className="p-4 bg-blue-500/10 rounded-2xl">
            <Users className="w-10 h-10 text-blue-400" />
          </div>
          <div>
            <h2 className="text-white font-bold text-lg">Nenhuma liga ainda</h2>
            <p className="text-white/40 text-sm mt-1 max-w-xs">
              Crie uma liga privada e convide seus amigos para disputar juntos!
            </p>
          </div>
          <Link
            href="/ligas/criar"
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all text-sm"
          >
            <Plus className="w-4 h-4" />
            Criar minha primeira liga
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {leagues.map((league) => {
            const isOwner = league.ownerId === session.user.id;
            return (
              <Link key={league.id} href={`/ligas/${league.id}`}>
                <div className="glass-card px-4 py-3.5 flex items-center gap-3 hover:border-blue-400/30 transition-all">
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0">
                    <Trophy className="w-5 h-5 text-blue-400" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-white text-sm truncate">{league.name}</span>
                      {isOwner && (
                        <span className="text-[9px] font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-400/30 px-1.5 py-0.5 rounded-full shrink-0 flex items-center gap-0.5">
                          <Crown className="w-2.5 h-2.5" /> Dono
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-white/35 text-xs flex-wrap">
                      {!isOwner && league.owner.image && (
                        <Image src={league.owner.image} alt="" width={12} height={12} className="rounded-full" />
                      )}
                      <span>
                        {isOwner ? "criada por você" : `${league.owner.name?.split(" ")[0]}`}
                      </span>
                      <span>·</span>
                      <Users className="w-3 h-3" />
                      <span>{league._count.members} membro{league._count.members !== 1 ? "s" : ""}</span>
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-white/20 shrink-0" />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {ownedCount >= 5 && (
        <p className="text-white/25 text-xs text-center">
          Limite de 5 ligas atingido. Delete uma para criar outra.
        </p>
      )}

      {/* Info */}
      <div className="glass rounded-xl px-4 py-3 border border-white/8 text-white/25 text-xs flex flex-wrap gap-x-4 gap-y-1">
        <span>👥 Max 50 membros por liga</span>
        <span>🏆 Ranking próprio em cada liga</span>
        <span>🔗 Convite por link</span>
      </div>
    </div>
  );
}
