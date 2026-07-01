"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { X, Upload } from "lucide-react";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { ScreenshotCategory, TradeScreenshot } from "@/types/trade";

const CATEGORIES: { value: ScreenshotCategory; label: string }[] = [
  { value: "before", label: "Antes de entrar" },
  { value: "during", label: "Durante la operación" },
  { value: "after", label: "Después del cierre" },
];

interface ScreenshotUploaderProps {
  value: TradeScreenshot[];
  onChange: (screenshots: TradeScreenshot[]) => void;
}

export function ScreenshotUploader({ value, onChange }: ScreenshotUploaderProps) {
  const configured = isSupabaseConfigured();
  const [uploadingCategory, setUploadingCategory] = useState<ScreenshotCategory | null>(null);
  const inputRefs = useRef<Record<ScreenshotCategory, HTMLInputElement | null>>({
    before: null,
    during: null,
    after: null,
  });

  async function handleFiles(category: ScreenshotCategory, files: FileList | null) {
    if (!files || files.length === 0) return;
    if (!configured) {
      toast.warning("Conecta Supabase para subir capturas.");
      return;
    }

    setUploadingCategory(category);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Debes iniciar sesión para subir capturas.");
        return;
      }

      const uploaded: TradeScreenshot[] = [];
      for (const file of Array.from(files)) {
        const path = `${user.id}/${crypto.randomUUID()}-${category}-${file.name}`;
        const { error } = await supabase.storage.from("trade-screenshots").upload(path, file);
        if (error) {
          toast.error(`No se pudo subir ${file.name}: ${error.message}`);
          continue;
        }
        const { data } = supabase.storage.from("trade-screenshots").getPublicUrl(path);
        uploaded.push({ url: data.publicUrl, category });
      }

      if (uploaded.length) {
        onChange([...value, ...uploaded]);
      }
    } finally {
      setUploadingCategory(null);
    }
  }

  function removeScreenshot(url: string) {
    onChange(value.filter((s) => s.url !== url));
  }

  return (
    <div className="space-y-3">
      <Label>Capturas</Label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {CATEGORIES.map((cat) => {
          const shots = value.filter((s) => s.category === cat.value);
          return (
            <div key={cat.value} className="space-y-1.5">
              <p className="text-xs text-ink-2">{cat.label}</p>
              <button
                type="button"
                disabled={!configured || uploadingCategory === cat.value}
                onClick={() => inputRefs.current[cat.value]?.click()}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-line px-2.5 py-2 text-xs text-ink-2 transition-colors hover:border-line-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Upload className="size-3.5" />
                {uploadingCategory === cat.value ? "Subiendo..." : "Subir imágenes"}
              </button>
              <input
                ref={(el) => {
                  inputRefs.current[cat.value] = el;
                }}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  void handleFiles(cat.value, e.target.files);
                  e.target.value = "";
                }}
              />
              {shots.length > 0 ? (
                <div className="grid grid-cols-3 gap-1.5">
                  {shots.map((shot) => (
                    <div key={shot.url} className="group relative aspect-square overflow-hidden rounded-md border border-line">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={shot.url} alt="" className="size-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeScreenshot(shot.url)}
                        aria-label="Quitar captura"
                        className="absolute top-0.5 right-0.5 flex size-4 items-center justify-center rounded-full bg-ink/80 text-bg opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <X className="size-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      {!configured ? (
        <p className="text-xs text-ink-3">Conecta Supabase para poder subir y guardar capturas.</p>
      ) : null}
    </div>
  );
}
