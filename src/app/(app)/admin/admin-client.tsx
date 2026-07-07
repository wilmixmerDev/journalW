"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { MoreVertical, Pencil, KeyRound, ShieldOff, ShieldCheck, Ban, UserCheck, ShieldPlus, ShieldMinus } from "lucide-react";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatDate } from "@/lib/format";
import { EditUserDialog } from "@/components/admin/edit-user-dialog";
import { ResetPasswordDialog } from "@/components/admin/reset-password-dialog";
import {
  disableUserMfa,
  listUsersForAdmin,
  requireUserMfa,
  setUserRole,
  setUserSuspended,
  type AdminUserRow,
} from "./actions";

interface AdminClientProps {
  initialUsers: AdminUserRow[];
  initialError: string | null;
  currentUserId: string;
}

export function AdminClient({ initialUsers, initialError, currentUserId }: AdminClientProps) {
  const [users, setUsers] = useState(initialUsers);
  const [error, setError] = useState(initialError);
  const [isPending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<AdminUserRow | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<AdminUserRow | null>(null);

  async function refresh() {
    const refreshed = await listUsersForAdmin();
    setUsers(refreshed.users);
    setError(refreshed.error);
  }

  function runAction(
    userId: string,
    action: (id: string) => Promise<{ error: string | null }>,
    successMessage: string,
    optimisticPatch: Partial<AdminUserRow>
  ) {
    setBusyId(userId);
    const previousUsers = users;
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...optimisticPatch } : u)));

    startTransition(async () => {
      const { error: actionError } = await action(userId);
      if (actionError) {
        toast.error(actionError);
        setUsers(previousUsers);
        setBusyId(null);
        return;
      }

      toast.success(successMessage);
      await refresh();
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
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Correo</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Registrado</TableHead>
                <TableHead>2FA</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-ink-3">
                    No hay usuarios registrados.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => {
                  const isBusy = isPending && busyId === u.id;
                  const isSelf = u.id === currentUserId;
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
                      <TableCell>
                        <Badge variant={u.isSuspended ? "destructive" : "secondary"}>
                          {u.isSuspended ? "Suspendido" : "Activo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button variant="ghost" size="icon-sm" disabled={isBusy}>
                                <MoreVertical />
                                <span className="sr-only">Acciones</span>
                              </Button>
                            }
                          />
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditUser(u)}>
                              <Pencil />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setResetPasswordUser(u)}>
                              <KeyRound />
                              Restablecer contraseña
                            </DropdownMenuItem>
                            {!u.mfaExempt ? (
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() =>
                                  runAction(u.id, disableUserMfa, "2FA desactivado para ese usuario.", {
                                    mfaExempt: true,
                                  })
                                }
                              >
                                <ShieldOff />
                                Desactivar 2FA
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() =>
                                  runAction(u.id, requireUserMfa, "2FA activado para ese usuario.", {
                                    mfaExempt: false,
                                  })
                                }
                              >
                                <ShieldCheck />
                                Activar 2FA
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              variant={u.isSuspended ? undefined : "destructive"}
                              disabled={isSelf}
                              onClick={() =>
                                runAction(
                                  u.id,
                                  (id) => setUserSuspended(id, !u.isSuspended),
                                  u.isSuspended ? "Usuario reactivado." : "Usuario suspendido.",
                                  { isSuspended: !u.isSuspended }
                                )
                              }
                            >
                              {u.isSuspended ? <UserCheck /> : <Ban />}
                              {u.isSuspended ? "Reactivar" : "Suspender"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={isSelf}
                              onClick={() =>
                                runAction(
                                  u.id,
                                  (id) => setUserRole(id, u.role === "admin" ? "user" : "admin"),
                                  u.role === "admin" ? "Ahora es usuario normal." : "Ahora es administrador.",
                                  { role: u.role === "admin" ? "user" : "admin" }
                                )
                              }
                            >
                              {u.role === "admin" ? <ShieldMinus /> : <ShieldPlus />}
                              {u.role === "admin" ? "Quitar admin" : "Hacer admin"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editUser ? (
        <EditUserDialog
          open={Boolean(editUser)}
          onOpenChange={(open) => !open && setEditUser(null)}
          user={editUser}
          onSaved={refresh}
        />
      ) : null}

      {resetPasswordUser ? (
        <ResetPasswordDialog
          open={Boolean(resetPasswordUser)}
          onOpenChange={(open) => !open && setResetPasswordUser(null)}
          userId={resetPasswordUser.id}
          userEmail={resetPasswordUser.email}
        />
      ) : null}
    </div>
  );
}
