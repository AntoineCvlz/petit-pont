import { Logo } from "@/components/brand/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <Logo className="mb-8 scale-125" />
      <div className="pp-net w-full max-w-sm rounded-2xl border border-line bg-night-850/95 p-6 shadow-2xl">{children}</div>
    </main>
  );
}
