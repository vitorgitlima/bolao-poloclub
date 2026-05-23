import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Trophy, Home, LogOut, Settings, FlaskConical } from "lucide-react";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen stadium-bg">
      {/* Navbar glassmorphism */}
      <nav className="sticky top-0 z-50 glass border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-2xl group-hover:scale-110 transition-transform">⚽</span>
            <div>
              <span className="font-black text-white text-lg leading-none copa-gradient">
                Bolão Copa
              </span>
              <span className="hidden sm:block text-white/30 text-xs leading-none">
                Mundial 2026
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-1">
            <Link
              href="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 text-sm font-medium transition-all"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:block">Jogos</span>
            </Link>
            <Link
              href="/ranking"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 text-sm font-medium transition-all"
            >
              <Trophy className="w-4 h-4" />
              <span className="hidden sm:block">Ranking</span>
            </Link>
            <Link
              href="/brasileirao"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 text-sm font-medium transition-all"
            >
              <FlaskConical className="w-4 h-4 text-yellow-400" />
              <span className="hidden sm:block">
                Série A
                <span className="ml-1 text-[9px] font-bold bg-yellow-400/20 text-yellow-300 px-1 py-0.5 rounded">BETA</span>
              </span>
            </Link>
            {process.env.ADMIN_EMAILS?.split(",").map(e => e.trim()).includes(session.user?.email ?? "") && (
              <Link
                href="/admin"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 text-sm font-medium transition-all"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:block">Admin</span>
              </Link>
            )}

            <div className="flex items-center gap-2 ml-2 pl-3 border-l border-white/10">
              {session.user?.image && (
                <Image
                  src={session.user.image}
                  alt={session.user.name ?? ""}
                  width={32}
                  height={32}
                  className="rounded-full ring-2 ring-white/20"
                />
              )}
              <span className="hidden sm:block text-sm text-white/70 font-medium truncate max-w-[100px]">
                {session.user?.name?.split(" ")[0]}
              </span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/login" });
                }}
              >
                <button
                  type="submit"
                  className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all"
                  title="Sair"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-6 pb-10">{children}</main>
    </div>
  );
}
