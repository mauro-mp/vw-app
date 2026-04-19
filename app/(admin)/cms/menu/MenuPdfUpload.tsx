"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { removeMenuPdf } from "./actions";

export function MenuPdfUpload({ currentUrl }: { currentUrl: string | null }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState(currentUrl);
  const [isPending, startTransition] = useTransition();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/cms/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (res.ok) setUrl(json.url);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function handleRemove() {
    startTransition(async () => {
      await removeMenuPdf();
      setUrl(null);
    });
  }

  const filename = url ? decodeURIComponent(url.split("/").pop() ?? url) : null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <input
        ref={fileRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />
      {url ? (
        <>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[color:var(--primary)] hover:underline truncate max-w-[220px]"
          >
            {filename}
          </a>
          <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? "Enviando…" : "Substituir"}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleRemove} disabled={isPending}>
            Remover
          </Button>
        </>
      ) : (
        <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? "Enviando…" : "Anexar PDF"}
        </Button>
      )}
    </div>
  );
}
