import { RepShell } from "@/components/rep/RepShell";
import { getSession } from "@/lib/session";

export const metadata = { title: "Unbuilt Sales" };

export default async function RepLayout({ children }: { children: React.ReactNode }) {
  const s = await getSession();
  // admins and managers sell too; the shell shows them a way back to the admin side
  return <RepShell isStaff={!!s && s.role !== "rep"}>{children}</RepShell>;
}
