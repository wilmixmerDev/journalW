"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { TwoFactorProofFields, type TwoFactorProof } from "@/components/settings/two-factor-proof-fields";
import { changePassword, sendSecurityEmailOtp } from "@/app/(app)/settings/actions";
import { Notice } from "@/components/ui/notice";

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasTotp: boolean;
}

const EMPTY_PROOF: TwoFactorProof = { method: "email", code: "" };

export function ChangePasswordDialog({ open, onOpenChange, hasTotp }: ChangePasswordDialogProps) {
  const [step, setStep] = useState<"password" | "proof">("password");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [proof, setProof] = useState<TwoFactorProof>({ ...EMPTY_PROOF, method: hasTotp ? "totp" : "email" });
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  function reset() {
    setStep("password");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setProof({ ...EMPTY_PROOF, method: hasTotp ? "totp" : "email" });
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  function goToProofStep() {
    setError(null);
    if (newPassword.length < 6) {
      setError("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setStep("proof");
  }

  async function handleSubmit() {
    setError(null);
    setIsPending(true);

    const { error: changeError } = await changePassword({ currentPassword, newPassword, proof });

    setIsPending(false);
    if (changeError) {
      setError(changeError);
      return;
    }

    toast.success("Contraseña actualizada");
    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Cambiar contraseña</DialogTitle>
          <DialogDescription>
            {step === "password"
              ? "Ingresa tu contraseña actual y la nueva."
              : "Confirma tu identidad para aplicar el cambio."}
          </DialogDescription>
        </DialogHeader>

        {error ? <Notice variant="error">{error}</Notice> : null}

        {step === "password" ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="currentPassword">Contraseña actual</Label>
              <PasswordInput
                id="currentPassword"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newPassword">Nueva contraseña</Label>
              <PasswordInput
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirmar nueva contraseña</Label>
              <PasswordInput
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <Button
              type="button"
              className="w-full"
              disabled={!currentPassword || !newPassword || !confirmPassword}
              onClick={goToProofStep}
            >
              Siguiente
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <TwoFactorProofFields
              hasTotp={hasTotp}
              value={proof}
              onChange={setProof}
              onSendEmailCode={sendSecurityEmailOtp}
            />
            <Button type="button" className="w-full" disabled={isPending || proof.code.length < 6} onClick={handleSubmit}>
              {isPending ? "Guardando..." : "Cambiar contraseña"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
