import Link from "next/link";
import BrandSettings from "@/components/BrandSettings";

export default function SettingsPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Impostazioni</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Configura il brand prima di esportare materiali per mentor o
            investitori.
          </p>
        </div>
        <Link
          href="/"
          className="text-sm font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          Torna alla dashboard
        </Link>
      </div>
      <BrandSettings />
    </main>
  );
}
