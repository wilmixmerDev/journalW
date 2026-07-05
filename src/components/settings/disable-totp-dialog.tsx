"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TwoFactorProofFields, type TwoFactorProof } from "@/components/settings/two-factor-proof-fields";
import { disableTotp, sendSecurityEmailOtp } from "@/app/(app)/settings/actions";

interface DisableTotpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DisableTotpDialog({ open, onOpenChange }: DisableTotpDialogProps) {
  const router = useRouter();
  const [proof, setProof] = useState<TwoFactorProof>({ method: "totp", code: "" });
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) {
      setProof({ method: "totp", code: "" });
      setError(null);
    }
  }

  async function handleSubmit() {
    setError(null);
    setIsPending(true);

    const { error: disableError } = await disableTotp(proof);

    setIsPending(false);
    if (disableError) {
      setError(disableError);
      return;
    }

    toast.success("App autenticadora desactivada");
    handleOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Desactivar app autenticadora</DialogTitle>
          <DialogDescription>Confirma tu identidad para desactivarla. Seguirás protegido por el correo.</DialogDescription>
        </DialogHeader>

        {error ? <p className="rounded-md border border-neg/30 bg-neg-soft px-3 py-2 text-xs text-neg">{error}</p> : null}

        <div className="space-y-4">
          <TwoFactorProofFields
            hasTotp
            value={proof}
            onChange={setProof}
            onSendEmailCode={sendSecurityEmailOtp}
          />
          <Button
            type="button"
            variant="destructive"
            className="w-full"
            disabled={isPending || proof.code.length < 6}
            onClick={handleSubmit}
          >
            {isPending ? "Desactivando..." : "Desactivar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
