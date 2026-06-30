import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { getEspnLiveDetailsByDate } from "@/lib/espn-api";

const getCachedLiveDetails = unstable_cache(
  async () => {
    const todayBRT = new Date().toLocaleDateString("en-CA", {
      timeZone: "America/Sao_Paulo",
    }).replace(/-/g, "");
    return getEspnLiveDetailsByDate(todayBRT);
  },
  ["live-details"],
  { revalidate: 30 }
);

export async function GET() {
  try {
    const details = await getCachedLiveDetails();
    return NextResponse.json({ details });
  } catch {
    return NextResponse.json({ details: [] });
  }
}
