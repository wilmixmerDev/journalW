"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { disableUserMfa, listUsersForAdmin, requireUserMfa, type AdminUserRow } from "./actions";

interface AdminClientProps {
  initialUsers: AdminUserRow[];
  initialError: string | null;
}

export function AdminClient({ initialUsers, initialError }: AdminClientProps) {
  const [users, setUsers] = useState(initialUsers);
  const [error, setError] = useState(initialError);
  const [isPending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  function runAction(
    userId: string,
    action: (id: string) => Promise<{ error: string | null }>,
    successMessage: string,
    optimisticMfaExempt: boolean
  ) {
    setBusyId(userId);
    const previousUsers = users;
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, mfaExempt: optimisticMfaExempt } : u)));

    startTransition(async () => {
      const { error: actionError } = await action(userId);
      if (actionError) {
        toast.error(actionError);
        setUsers(previousUsers);
        setBusyId(null);
        return;
      }

      toast.success(successMessage);
      const refreshed = await listUsersForAdmin();
      setUsers(refreshed.users);
      setError(refreshed.error);
      setBusyId(null);
    });
  }

  return (
    <div className="space-y-6 p-4 lg:p-8">
      <div>
        <h1 className="font-serif text-3xl text-ink">Administración</h1>
        <p className="text-sm text-ink-2">Gestiona los usuarios de Journal W.</p>
      </div>

      {error ? (
        <p className="rounded-md border border-neg/30 bg-neg-soft px-3 py-2 text-xs text-neg">{error}</p>
      ) : null}

      <Card className="border-line bg-surface">
        <CardHeader>
          <CardTitle>Usuarios</CardTitle>
          <CardDescription>{users.length} cuentas registradas.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Correo</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Registrado</TableHead>
                <TableHead>2FA</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-ink-3">
                    No hay usuarios registrados.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => {
                  const isBusy = isPending && busyId === u.id;
                  return (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium text-ink">{u.email ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                          {u.role === "admin" ? "Admin" : "Usuario"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-ink-2">{formatDate(u.createdAt)}</TableCell>
                      <TableCell>
                        <Badge variant={u.mfaExempt ? "secondary" : "default"}>
                          {u.mfaExempt ? "Desactivado" : "Activado"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {!u.mfaExempt ? (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            disabled={isBusy}
                            onClick={() =>
                              runAction(u.id, disableUserMfa, "2FA desactivado para ese usuario.", true)
                            }
                          >
                            {isBusy ? "Actualizando..." : "Desactivar 2FA"}
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            disabled={isBusy}
                            onClick={() =>
                              runAction(u.id, requireUserMfa, "2FA activado para ese usuario.", false)
                            }
                          >
                            {isBusy ? "Actualizando..." : "Activar 2FA"}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
