"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resetUserPassword } from "@/app/(app)/admin/actions";
import { Notice } from "@/components/ui/notice";

interface ResetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userEmail: string | null;
}

export function ResetPasswordDialog({ open, onOpenChange, userId, userEmail }: ResetPasswordDialogProps) {
  const [password, setPassword] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setPassword(null);
      setError(null);
    }
    onOpenChange(next);
  }

  async function handleGenerate() {
    setError(null);
    setIsPending(true);
    const { error: resetError, password: newPassword } = await resetUserPassword(userId);
    setIsPending(false);

    if (resetError) {
      setError(resetError);
      return;
    }
    setPassword(newPassword);
  }

  function copyPassword() {
    if (!password) return;
    navigator.clipboard.writeText(password);
    toast.success("Contraseña copiada");
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Restablecer contraseña</DialogTitle>
          <DialogDescription>
            {password
              ? "Compártela de forma segura con el usuario — no se volverá a mostrar."
              : `Se generará una contraseña nueva para ${userEmail ?? "este usuario"}.`}
          </DialogDescription>
        </DialogHeader>

        {error ? <Notice variant="error">{error}</Notice> : null}

        {password ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input readOnly value={password} className="font-mono" />
              <Button type="button" variant="outline" onClick={copyPassword}>
                Copiar
              </Button>
            </div>
            <Button type="button" className="w-full" onClick={() => handleOpenChange(false)}>
              Listo
            </Button>
          </div>
        ) : (
          <Button type="button" className="w-full" disabled={isPending} onClick={handleGenerate}>
            {isPending ? "Generando..." : "Generar nueva contraseña"}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
