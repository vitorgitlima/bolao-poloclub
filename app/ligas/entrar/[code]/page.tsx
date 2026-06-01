import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { Users, Trophy } from "lucide-react";
import Image from "next/image";

export const dynamic = "force-dynamic";

export default async function EntrarLigaPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const session = await auth();

  // Não logado → login com callbackUrl para voltar aqui depois
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/ligas/entrar/${code}`);
  }

  const league = await prisma.league.findUnique({
    where: { inviteCode: code },
    include: {
      owner: { select: { name: true, image: true } },
      _count: { select: { members: true } },
    },
  });

  if (!league) {
    return (
      <div className="min-h-screen stadium-bg flex items-center justify-center p-4">
        <div className="glass rounded-2xl p-8 text-center space-y-4 max-w-sm w-full">
          <div className="text-5xl">🔗</div>
          <h2 className="text-white font-bold text-xl">Link inválido</h2>
          <p className="text-white/40 text-sm">Este link de convite não existe ou foi desativado pelo dono da liga.</p>
          <Link href="/ligas" className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-all">
            Ver minhas ligas
          </Link>
        </div>
      </div>
    );
  }

  // Já é membro → redirect direto
  const alreadyMember = await prisma.leagueMember.findUnique({
    where: { leagueId_userId: { leagueId: league.id, userId: session.user.id } },
  });
  if (alreadyMember) redirect(`/ligas/${league.id}`);

  // Liga cheia
  if (league._count.members >= 50) {
    return (
      <div className="min-h-screen stadium-bg flex items-center justify-center p-4">
        <div className="glass rounded-2xl p-8 text-center space-y-4 max-w-sm w-full">
          <div className="text-5xl">😕</div>
          <h2 className="text-white font-bold text-xl">Liga cheia</h2>
          <p className="text-white/40 text-sm">Esta liga já atingiu o limite de 50 membros.</p>
          <Link href="/ligas" className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-all">
            Ver minhas ligas
          </Link>
        </div>
      </div>
    );
  }

  // Entra na liga e redireciona
  await prisma.leagueMember.create({
    data: { leagueId: league.id, userId: session.user.id },
  });

  redirect(`/ligas/${league.id}`);
}
