"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { enrollTotp, type TotpEnrollment } from "@/lib/mfa/enroll-totp";

interface EnrollTotpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EnrollTotpDialog({ open, onOpenChange }: EnrollTotpDialogProps) {
  const router = useRouter();
  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  // El prop `open` lo controla el padre directamente (no un cierre disparado por la propia primitiva),
  // así que el enroll se dispara reaccionando al valor de `open`, no dentro de onOpenChange.
  useEffect(() => {
    if (!open || enrollment) return;
    let cancelled = false;
    enrollTotp(createClient()).then((enrolled) => {
      if (cancelled) return;
      if (!enrolled) {
        setError("No se pudo iniciar la activación. Intenta de nuevo.");
        return;
      }
      setEnrollment(enrolled);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) {
      setEnrollment(null);
      setCode("");
      setError(null);
    }
  }

  async function verify(currentCode: string) {
    if (!enrollment) return;
    setIsPending(true);
    setError(null);

    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId: enrollment.factorId,
      code: currentCode,
    });

    setIsPending(false);
    if (verifyError) {
      setError(verifyError.message);
      setCode("");
      return;
    }

    toast.success("App autenticadora activada");
    handleOpenChange(false);
    router.refresh();
  }

  function handleCodeChange(event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value.replace(/\D/g, "");
    setCode(value);
    if (value.length === 6) verify(value);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Activar app autenticadora</DialogTitle>
          <DialogDescription>Escanea el código QR y confírmalo con el código de 6 dígitos.</DialogDescription>
        </DialogHeader>

        {error ? <p className="rounded-md border border-neg/30 bg-neg-soft px-3 py-2 text-xs text-neg">{error}</p> : null}

        {enrollment ? (
          <div className="space-y-4">
            <div className="space-y-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={enrollment.qrCode}
                alt="Código QR para activar 2FA"
                className="mx-auto size-40 rounded-lg border border-line bg-white p-2"
              />
              <p className="rounded-md border border-line bg-surface-2 px-3 py-2 text-center font-mono text-xs break-all text-ink-2">
                {enrollment.secret}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="totp-enroll-code">Código de 6 dígitos</Label>
              <Input
                id="totp-enroll-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="123456"
                autoFocus
                disabled={isPending}
                value={code}
                onChange={handleCodeChange}
              />
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
