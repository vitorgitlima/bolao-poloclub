import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { LogOut } from "lucide-react";
import { NavLinks } from "@/components/nav-links";
import { NotificationBell } from "@/components/notification-bell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen stadium-bg overflow-x-hidden">
      {/* Navbar glassmorphism */}
      <nav className="sticky top-0 z-50 glass border-b border-white/10">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 flex items-center justify-between gap-3">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-1.5 group shrink-0">
            <span className="text-xl group-hover:scale-110 transition-transform">⚽</span>
            <div className="hidden xs:block">
              <span className="font-black text-white text-base leading-none copa-gradient whitespace-nowrap block">
                Bolão da Copa
              </span>
              <div className="hidden lg:flex items-center gap-1.5 mt-0.5">
                <span className="text-white/30 text-xs leading-none whitespace-nowrap">Mundial 2026</span>
                <div className="flex items-center gap-0.5">
                  {["us", "mx", "ca"].map((code) => (
                    <Image
                      key={code}
                      src={`https://flagcdn.com/w40/${code}.png`}
                      alt={code}
                      width={16}
                      height={11}
                      className="rounded-sm opacity-60"
                    />
                  ))}
                </div>
              </div>
            </div>
          </Link>

          {/* Nav + user */}
          <div className="flex items-center gap-1">
            <NavLinks
              isAdmin={process.env.ADMIN_EMAILS?.split(",").map(e => e.trim()).includes(session.user?.email ?? "") ?? false}
            />
            <NotificationBell />
            <div className="flex items-center gap-1.5 ml-1.5 pl-2 border-l border-white/10 shrink-0">
              {session.user?.image && (
                <Image
                  src={session.user.image}
                  alt=""
                  width={28}
                  height={28}
                  className="rounded-full ring-2 ring-white/20 shrink-0"
                />
              )}
              <span className="hidden md:block text-sm text-white/70 font-medium truncate max-w-[80px]">
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
                  className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all shrink-0"
                  title="Sair"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-3 sm:px-4 py-6 pb-10 w-full">{children}</main>
      <footer className="text-center text-white/20 text-xs pb-6">
        Built by <span className="text-white/40 font-medium">SatoshiStandard</span>
      </footer>
    </div>
  );
}
