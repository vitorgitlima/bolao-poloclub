import { auth } from "@/lib/auth";
import { RankingLive } from "@/components/ranking-live";

export default async function RankingPage() {
  const session = await auth();
  return <RankingLive userId={session?.user?.id ?? undefined} />;
}
