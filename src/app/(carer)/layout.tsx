import { MobileNav } from "@/components/shared/mobile-nav";
import { Header } from "@/components/shared/header";

export default function CarerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh flex flex-col">
      <Header />
      <main className="flex-1 pb-20">{children}</main>
      <MobileNav />
    </div>
  );
}
