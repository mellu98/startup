"use client";

import { useEffect, useState } from "react";
import type { BrandProfile } from "@/lib/brand-profile";

const EMPTY_PROFILE: BrandProfile = {
  companyName: "",
  founderNames: "",
  logoDataUrl: null,
  primaryColor: "#2563eb",
  industryTagline: "",
};

export default function BrandSettings() {
  const [profile, setProfile] = useState<BrandProfile>(EMPTY_PROFILE);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/brand")
      .then((res) => res.json())
      .then(setProfile)
      .catch(console.error);
  }, []);

  const update = (patch: Partial<BrandProfile>) => {
    setSaved(false);
    setProfile((current) => ({ ...current, ...patch }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/brand", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!res.ok) throw new Error(await res.text());
      setProfile(await res.json());
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Brand del dossier</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Questi dati finiscono nei PDF, nel pitch deck e nella data room. Non è
          decorazione: è credibilità percepita.
        </p>
      </div>

      <div className="grid gap-4">
        <label className="grid gap-1 text-sm font-medium">
          Nome azienda
          <input
            value={profile.companyName}
            onChange={(event) => update({ companyName: event.target.value })}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Founder
          <input
            value={profile.founderNames}
            onChange={(event) => update({ founderNames: event.target.value })}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Tagline / settore
          <input
            value={profile.industryTagline}
            onChange={(event) =>
              update({ industryTagline: event.target.value })
            }
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Colore primario
          <input
            type="color"
            value={profile.primaryColor}
            onChange={(event) => update({ primaryColor: event.target.value })}
            className="h-11 w-24 rounded-md border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Logo data URL (opzionale)
          <textarea
            value={profile.logoDataUrl ?? ""}
            onChange={(event) =>
              update({ logoDataUrl: event.target.value || null })
            }
            rows={3}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-950"
            placeholder="data:image/png;base64,..."
          />
        </label>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-md bg-zinc-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {saving ? "Salvataggio..." : "Salva brand"}
        </button>
        {saved && <span className="text-sm text-green-700">Salvato.</span>}
      </div>
    </div>
  );
}
