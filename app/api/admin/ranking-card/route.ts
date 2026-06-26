import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { computeRanking } from "@/lib/ranking";

function isAdmin(email?: string | null) {
  const admins = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim());
  return email ? admins.includes(email) : false;
}

const MEDALS = ["🥇", "🥈", "🥉"];

export async function GET() {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ranking } = await computeRanking();

  const brtNow = new Date().toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const lines: string[] = [
    "🏆 Ranking Bolão Copa 2026",
    `📅 ${brtNow}`,
    "",
  ];

  for (let i = 0; i < ranking.length; i++) {
    const u = ranking[i];
    const pos = i < 3 ? MEDALS[i] : `${i + 1}.`;
    const name = (u.name ?? "—").split(" ")[0];
    lines.push(`${pos} ${name} — ${u.totalPoints}pts`);
  }

  lines.push("", "bitscore.vercel.app ⚽");

  return NextResponse.json({ text: lines.join("\n") });
}
