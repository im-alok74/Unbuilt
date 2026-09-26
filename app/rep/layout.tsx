import { RepShell } from "@/components/rep/RepShell";

export const metadata = { title: "Unbuilt Sales" };

export default function RepLayout({ children }: { children: React.ReactNode }) {
  return <RepShell>{children}</RepShell>;
}
