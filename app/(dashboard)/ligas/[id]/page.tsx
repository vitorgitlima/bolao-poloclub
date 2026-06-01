"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft, Users, Crown, Copy, Check, Loader2,
  Settings, Trash2, LogOut, RefreshCw, Trophy,
  UserPlus, Search, X,
} from "lucide-react";
import { RankingTable } from "@/components/ranking-table";
import { RankingHighlights } from "@/components/ranking-highlights";
import { cn } from "@/lib/utils";

type Member = {
  userId: string;
  name: string | null;
  image: string | null;
  isContributor: boolean;
  isDeveloper: boolean;
  joinedAt: string;
};

type LeagueDetail = {
  id: string;
  name: string;
  inviteCode: string;
  isOwner: boolean;
  owner: { id: string; name: string | null; image: string | null };
  members: Member[];
  createdAt: string;
};

type RankingEntry = {
  id: string; name: string | null; image: string | null;
  isContributor: boolean; isDeveloper: boolean;
  totalPoints: number; exactScores: number; correctWinners: number;
  predictions: number; isLeader: boolean; isTopStreak: boolean;
  isTopExact: boolean; isTopRiser: boolean; isBolasMurcha: boolean;
};

type Highlights = {
  roundName: string;
  craque: { names: string[]; points: number } | null;
  reiExatos: { names: string[]; count: number } | null;
  maiorSubida: { names: string[]; positions: number } | null;
  bolaMurcha: Array<string | null> | null;
};

type UserResult = { id: string; name: string | null; image: string | null };

export default function LeaguePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [league, setLeague] = useState<LeagueDetail | null>(null);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [highlights, setHighlights] = useState<Highlights | null>(null);
  const [activeTab, setActiveTab] = useState<"ranking" | "membros">("ranking");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();

  // Settings
  const [showSettings, setShowSettings] = useState(false);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // Remove member
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Invite existing user
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchLeague = useCallback(async () => {
    try {
      const [leagueRes, rankingRes] = await Promise.all([
        fetch(`/api/leagues/${id}`),
        fetch(`/api/leagues/${id}/ranking`),
      ]);
      if (!leagueRes.ok) { setError("Liga não encontrada ou acesso negado."); return; }
      const data: LeagueDetail = await leagueRes.json();
      setLeague(data);
      setEditName(data.name);
      if (rankingRes.ok) {
        const r = await rankingRes.json();
        setRanking(r.ranking ?? []);
        setHighlights(r.highlights ?? null);
      }
    } catch { setError("Erro ao carregar a liga."); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => {
    fetchLeague();
    fetch("/api/auth/session").then(r => r.json()).then(s => setCurrentUserId(s?.user?.id));
  }, [fetchLeague]);

  // Busca usuários com debounce
  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    searchRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/leagues/${id}/members/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) setSearchResults(await res.json());
      } finally { setSearching(false); }
    }, 350);
  }, [searchQuery, id]);

  function copyInviteLink() {
    if (!league) return;
    navigator.clipboard.writeText(`${window.location.origin}/ligas/entrar/${league.inviteCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSaveName() {
    if (!league || !editName.trim() || editName.trim() === league.name) return;
    setSaving(true); setSettingsError(null);
    try {
      const res = await fetch(`/api/leagues/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName }),
      });
      const data = await res.json();
      if (!res.ok) { setSettingsError(data.error); return; }
      setLeague((l) => l ? { ...l, name: data.name } : l);
    } catch { setSettingsError("Erro de conexão"); }
    finally { setSaving(false); }
  }

  async function handleRegenerateCode() {
    if (!league || !confirm("O link atual deixará de funcionar. Continuar?")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/leagues/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerateCode: true }),
      });
      const data = await res.json();
      if (res.ok) setLeague((l) => l ? { ...l, inviteCode: data.inviteCode } : l);
    } finally { setSaving(false); }
  }

  async function handleDeleteLeague() {
    if (!league || !confirm(`Deletar a liga "${league.name}"? Esta ação não pode ser desfeita.`)) return;
    await fetch(`/api/leagues/${id}`, { method: "DELETE" });
    router.push("/ligas");
  }

  async function handleLeave() {
    if (!confirm("Tem certeza que quer sair desta liga?")) return;
    await fetch(`/api/leagues/${id}/leave`, { method: "POST" });
    router.push("/ligas");
  }

  async function handleRemoveMember(userId: string, name: string | null) {
    if (!confirm(`Remover ${name ?? "este membro"}?`)) return;
    setRemovingId(userId);
    try {
      await fetch(`/api/leagues/${id}/members/${userId}`, { method: "DELETE" });
      setLeague((l) => l ? { ...l, members: l.members.filter((m) => m.userId !== userId) } : l);
      setRanking((r) => r.filter((u) => u.id !== userId));
    } finally { setRemovingId(null); }
  }

  async function handleAddUser(user: UserResult) {
    setAddingId(user.id); setAddError(null); setAddSuccess(null);
    try {
      const res = await fetch(`/api/leagues/${id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (!res.ok) { setAddError(data.error); return; }
      setAddSuccess(`${user.name ?? "Usuário"} adicionado!`);
      setSearchQuery("");
      setSearchResults([]);
      fetchLeague();
      setTimeout(() => setAddSuccess(null), 3000);
    } catch { setAddError("Erro de conexão"); }
    finally { setAddingId(null); }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
    </div>
  );

  if (error || !league) return (
    <div className="glass-card p-8 text-center space-y-3 max-w-sm w-full">
      <p className="text-white/60">{error ?? "Liga não encontrada."}</p>
      <Link href="/ligas" className="text-blue-400 text-sm hover:underline">← Voltar para Ligas</Link>
    </div>
  );

  const inviteUrl = typeof window !== "undefined"
    ? `${window.location.origin}/ligas/entrar/${league.inviteCode}`
    : `/ligas/entrar/${league.inviteCode}`;

  return (
    <div className="space-y-4 max-w-2xl w-full">

      {/* Header */}
      <div className="flex items-center gap-2">
        <Link href="/ligas" className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg sm:text-xl font-black text-white truncate">{league.name}</h1>
            {league.isOwner && (
              <span className="text-[9px] font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-400/30 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shrink-0">
                <Crown className="w-2.5 h-2.5" /> Dono
              </span>
            )}
          </div>
          <p className="text-white/40 text-xs">{league.members.length} membro{league.members.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={copyInviteLink}
            className="flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium rounded-xl bg-blue-500/15 text-blue-300 hover:bg-blue-500/25 transition-all border border-blue-400/20"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden xs:inline">{copied ? "Copiado!" : "Copiar link"}</span>
          </button>
          {league.isOwner ? (
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={cn("p-2 rounded-xl transition-all", showSettings ? "bg-white/15 text-white" : "text-white/40 hover:text-white hover:bg-white/10")}
            >
              <Settings className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleLeave} className="p-2 rounded-xl text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-all" title="Sair">
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && league.isOwner && (
        <div className="glass-card p-4 space-y-4 border border-white/10">
          <p className="text-white/50 text-[10px] uppercase tracking-wider font-semibold">Configurações</p>

          {/* Rename */}
          <div>
            <p className="text-white/40 text-xs mb-1.5">Nome da liga</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={50}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-400/40 min-w-0"
              />
              <button
                onClick={handleSaveName}
                disabled={saving || editName.trim() === league.name || editName.trim().length < 2}
                className="px-3 py-2 bg-blue-600/40 hover:bg-blue-600 text-blue-200 text-sm rounded-lg transition-all disabled:opacity-40 shrink-0"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
              </button>
            </div>
            {settingsError && <p className="text-red-400 text-xs mt-1">{settingsError}</p>}
          </div>

          {/* Invite link */}
          <div>
            <p className="text-white/40 text-xs mb-1.5">Link de convite</p>
            <div className="flex gap-2 items-center">
              <div className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/40 text-xs truncate min-w-0">
                {inviteUrl}
              </div>
              <button
                onClick={copyInviteLink}
                className="p-2 rounded-lg bg-blue-500/15 text-blue-300 hover:bg-blue-500/25 transition-all shrink-0"
                title="Copiar link"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={handleRegenerateCode}
                disabled={saving}
                className="p-2 rounded-lg text-white/40 hover:text-yellow-300 hover:bg-yellow-400/10 transition-all shrink-0"
                title="Gerar novo link (invalida o atual)"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Invite registered users */}
          <div>
            <p className="text-white/40 text-xs mb-1.5 flex items-center gap-1">
              <UserPlus className="w-3.5 h-3.5" /> Adicionar usuário registrado
            </p>
            <div className="relative">
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 focus-within:border-blue-400/40">
                <Search className="w-3.5 h-3.5 text-white/30 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nome..."
                  className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder:text-white/25 min-w-0"
                />
                {searchQuery && (
                  <button onClick={() => { setSearchQuery(""); setSearchResults([]); }} className="text-white/30 hover:text-white/60">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                {searching && <Loader2 className="w-3.5 h-3.5 text-white/30 animate-spin shrink-0" />}
              </div>

              {searchResults.length > 0 && (
                <div className="mt-1 bg-slate-900/95 border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                  {searchResults.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleAddUser(user)}
                      disabled={addingId === user.id}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/8 transition-all border-b border-white/5 last:border-0 text-left"
                    >
                      {user.image ? (
                        <Image src={user.image} alt="" width={28} height={28} className="rounded-full shrink-0" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/60 text-xs font-bold shrink-0">
                          {user.name?.[0]?.toUpperCase() ?? "?"}
                        </div>
                      )}
                      <span className="flex-1 text-white/80 text-sm truncate">{user.name ?? "Anônimo"}</span>
                      {addingId === user.id
                        ? <Loader2 className="w-3.5 h-3.5 text-white/40 animate-spin shrink-0" />
                        : <UserPlus className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      }
                    </button>
                  ))}
                </div>
              )}

              {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                <p className="text-white/30 text-xs mt-2 px-1">Nenhum usuário encontrado com esse nome.</p>
              )}
            </div>

            {addSuccess && <p className="text-green-400 text-xs mt-2">✓ {addSuccess}</p>}
            {addError && <p className="text-red-400 text-xs mt-2">{addError}</p>}
          </div>

          {/* Delete */}
          <div className="pt-1 border-t border-white/10">
            <button
              onClick={handleDeleteLeague}
              className="flex items-center gap-2 text-red-400/70 hover:text-red-400 text-sm transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Deletar liga permanentemente
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1.5">
        <button
          onClick={() => setActiveTab("ranking")}
          className={`tab-pill ${activeTab === "ranking" ? "tab-pill-active" : "tab-pill-inactive"}`}
        >
          🏆 Ranking
        </button>
        <button
          onClick={() => setActiveTab("membros")}
          className={`tab-pill flex items-center gap-1.5 ${activeTab === "membros" ? "tab-pill-active" : "tab-pill-inactive"}`}
        >
          <Users className="w-3.5 h-3.5" />
          Membros
          <span className="text-[10px] opacity-70">({league.members.length})</span>
        </button>
      </div>

      {/* Tab: Ranking */}
      {activeTab === "ranking" && (
        <div className="space-y-4">
          {highlights && <RankingHighlights highlights={highlights} />}
          <div className="glass-card p-4">
            <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Trophy className="w-3.5 h-3.5" />
              Ranking da Liga
            </h2>
            {ranking.length === 0 ? (
              <div className="text-center py-10 text-white/30">
                <Trophy className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhum palpite pontuado ainda</p>
                <p className="text-xs mt-1">Aguarde os jogos terminarem!</p>
              </div>
            ) : (
              <RankingTable data={ranking} currentUserId={currentUserId} />
            )}
          </div>
        </div>
      )}

      {/* Tab: Membros */}
      {activeTab === "membros" && (
        <div className="glass-card p-4 space-y-2">
          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Users className="w-3.5 h-3.5" />
            Membros ({league.members.length}/50)
          </h2>
          {league.members.map((member) => {
            const isOwner = member.userId === league.owner.id;
            const isMe = member.userId === currentUserId;
            return (
              <div key={member.userId} className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl",
                isMe ? "bg-green-500/10 border border-green-500/20" : "bg-white/4"
              )}>
                {member.image ? (
                  <Image src={member.image} alt="" width={32} height={32} className="rounded-full ring-1 ring-white/10 shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 font-bold text-xs shrink-0">
                    {member.name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-white text-sm font-medium truncate">{member.name ?? "Anônimo"}</span>
                    {isMe && <span className="text-[10px] text-green-400">(você)</span>}
                    {isOwner && <Crown className="w-3 h-3 text-yellow-400 shrink-0" />}
                    {member.isContributor && (
                      <span className="text-[9px] font-bold bg-purple-500/20 text-purple-200 border border-purple-400/30 px-1 py-0.5 rounded-full shrink-0">✦</span>
                    )}
                  </div>
                  <p className="text-white/30 text-[10px]">entrou {new Date(member.joinedAt).toLocaleDateString("pt-BR")}</p>
                </div>
                {league.isOwner && !isOwner && (
                  <button
                    onClick={() => handleRemoveMember(member.userId, member.name)}
                    disabled={removingId === member.userId}
                    className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-all shrink-0"
                    title="Remover"
                  >
                    {removingId === member.userId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Invite banner (aba ranking) */}
      {activeTab === "ranking" && (
        <button
          onClick={copyInviteLink}
          className="w-full glass rounded-xl px-4 py-3 border border-blue-400/20 bg-blue-400/5 flex items-center gap-3 hover:bg-blue-400/10 transition-all text-left"
        >
          <Copy className="w-4 h-4 text-blue-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-blue-300 font-semibold text-sm">Convidar mais amigos</p>
            <p className="text-blue-300/50 text-xs truncate">{inviteUrl}</p>
          </div>
          {copied ? <Check className="w-4 h-4 text-green-400 shrink-0" /> : <span className="text-blue-400/50 text-xs shrink-0">copiar</span>}
        </button>
      )}
    </div>
  );
}
