"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Trophy, Home, Settings, FlaskConical, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = { isAdmin: boolean };

export function NavLinks({ isAdmin }: Props) {
  const pathname = usePathname();

  function linkClass(href: string, exact = false) {
    const active = exact ? pathname === href : pathname.startsWith(href);
    return cn(
      "flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm font-medium transition-all",
      active
        ? "text-white bg-white/10"
        : "text-white/60 hover:text-white hover:bg-white/10"
    );
  }

  const guiaActive = pathname === "/como-jogar";

  return (
    <>
      <Link
        href="/como-jogar"
        className={cn(
          "flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm font-medium transition-all border",
          guiaActive
            ? "bg-green-500/20 border-green-500/30 text-green-300"
            : "bg-green-500/10 border-green-500/20 text-green-300 hover:bg-green-500/20"
        )}
      >
        <BookOpen className="w-3.5 h-3.5 shrink-0" />
        <span className="hidden md:block whitespace-nowrap">Comece Aqui</span>
        <span className="text-[9px] font-black bg-green-400/20 text-green-300 px-1 py-0.5 rounded leading-none hidden lg:inline">
          NOVO
        </span>
      </Link>

      <Link href="/" className={linkClass("/", true)}>
        <Home className="w-4 h-4" />
        <span className="hidden sm:block">Jogos</span>
      </Link>

      <Link href="/ranking" className={linkClass("/ranking")}>
        <Trophy className="w-4 h-4" />
        <span className="hidden sm:block">Ranking</span>
      </Link>

      <Link href="/brasileirao" className={cn(linkClass("/brasileirao"), "gap-1.5")}>
        <FlaskConical className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
        <span className="whitespace-nowrap text-xs">
          Série A{" "}
          <span className="text-[9px] font-bold bg-yellow-400/20 text-yellow-300 px-1 py-0.5 rounded align-middle">
            BETA
          </span>
        </span>
      </Link>

      {isAdmin && (
        <Link href="/admin" className={linkClass("/admin")}>
          <Settings className="w-4 h-4" />
          <span className="hidden sm:block">Admin</span>
        </Link>
      )}
    </>
  );
}
