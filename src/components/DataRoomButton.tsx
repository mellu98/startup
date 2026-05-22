"use client";

import { useState } from "react";

export default function DataRoomButton() {
  const [loading, setLoading] = useState(false);

  const exportDataRoom = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/data-room/export", { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "data-room.zip";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Data room export failed:", err);
      alert("Errore durante l'esportazione della data room.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={exportDataRoom}
      disabled={loading}
      className="rounded-md bg-blue-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-50"
    >
      {loading ? "Esportazione..." : "Esporta Data Room"}
    </button>
  );
}
