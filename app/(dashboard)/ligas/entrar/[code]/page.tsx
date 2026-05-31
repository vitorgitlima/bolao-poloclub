import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { Users, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function EntrarLigaPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const session = await auth();

  // Usuário não logado → login com callbackUrl para voltar aqui
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/ligas/entrar/${code}`);
  }

  const league = await prisma.league.findUnique({
    where: { inviteCode: code },
    include: {
      owner: { select: { name: true } },
      _count: { select: { members: true } },
    },
  });

  if (!league) {
    return (
      <div className="max-w-md w-full">
        <div className="glass-card p-8 text-center space-y-3">
          <div className="text-4xl">🔗</div>
          <h2 className="text-white font-bold text-lg">Link inválido</h2>
          <p className="text-white/40 text-sm">Este link de convite não existe ou foi desativado.</p>
          <Link href="/ligas" className="inline-block text-blue-400 text-sm hover:underline">
            Ver minhas ligas →
          </Link>
        </div>
      </div>
    );
  }

  // Verifica se já é membro
  const alreadyMember = await prisma.leagueMember.findUnique({
    where: { leagueId_userId: { leagueId: league.id, userId: session.user.id } },
  });

  if (alreadyMember) {
    redirect(`/ligas/${league.id}`);
  }

  if (league._count.members >= 50) {
    return (
      <div className="max-w-md w-full">
        <div className="glass-card p-8 text-center space-y-3">
          <div className="text-4xl">😕</div>
          <h2 className="text-white font-bold text-lg">Liga cheia</h2>
          <p className="text-white/40 text-sm">Esta liga já atingiu o limite de 50 membros.</p>
          <Link href="/ligas" className="inline-block text-blue-400 text-sm hover:underline">
            Ver minhas ligas →
          </Link>
        </div>
      </div>
    );
  }

  // Tudo OK → entra na liga
  await prisma.leagueMember.create({
    data: { leagueId: league.id, userId: session.user.id },
  });

  redirect(`/ligas/${league.id}`);
}
