import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

function isAdmin(email?: string | null) {
  const admins = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim());
  return email ? admins.includes(email) : false;
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) redirect("/");
  return <>{children}</>;
}
