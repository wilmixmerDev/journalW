"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { EnrollTotpDialog } from "@/components/settings/enroll-totp-dialog";
import { DisableTotpDialog } from "@/components/settings/disable-totp-dialog";
import { ChangePasswordDialog } from "@/components/settings/change-password-dialog";

interface SecurityCardProps {
  emailMfaVerifiedAt: string | null;
  hasTotp: boolean;
}

export function SecurityCard({ emailMfaVerifiedAt, hasTotp }: SecurityCardProps) {
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  return (
    <Card className="border-line bg-surface">
      <CardHeader>
        <CardTitle>Seguridad</CardTitle>
        <CardDescription>Verificación en dos pasos y contraseña.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border border-line px-3 py-2.5">
          <div>
            <p className="text-sm font-medium text-ink">Correo</p>
            <p className="text-xs text-ink-3">
              {emailMfaVerifiedAt ? `Activo desde ${formatDate(emailMfaVerifiedAt)}` : "No verificado"}
            </p>
          </div>
          <Badge variant="outline" className="text-pos">
            Obligatorio
          </Badge>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-line px-3 py-2.5">
          <div>
            <p className="text-sm font-medium text-ink">App autenticadora</p>
            <p className="text-xs text-ink-3">{hasTotp ? "Activada" : "No activada"}</p>
          </div>
          {hasTotp ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setDisableOpen(true)}>
              Desactivar
            </Button>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={() => setEnrollOpen(true)}>
              Activar
            </Button>
          )}
        </div>

        <Button type="button" variant="outline" onClick={() => setPasswordOpen(true)}>
          Cambiar contraseña
        </Button>
      </CardContent>

      <EnrollTotpDialog open={enrollOpen} onOpenChange={setEnrollOpen} />
      <DisableTotpDialog open={disableOpen} onOpenChange={setDisableOpen} />
      <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} hasTotp={hasTotp} />
    </Card>
  );
}
