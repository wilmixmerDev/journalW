import { createClient } from "@/lib/supabase/client";

type BrowserSupabaseClient = ReturnType<typeof createClient>;

export interface TotpEnrollment {
  factorId: string;
  qrCode: string;
  secret: string;
}

/** Limpia inscripciones de TOTP sin verificar y crea una nueva. Se llama desde el cliente (usa la sesión activa). */
export async function enrollTotp(supabase: BrowserSupabaseClient): Promise<TotpEnrollment | null> {
  async function cleanUpUnverified() {
    const { data } = await supabase.auth.mfa.listFactors();
    for (const factor of data?.all ?? []) {
      if (factor.factor_type === "totp" && factor.status === "unverified") {
        await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }
    }
  }

  await cleanUpUnverified();
  let { data, error: enrollError } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "Authenticator",
  });

  if (enrollError?.message.includes("already exists")) {
    await cleanUpUnverified();
    ({ data, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Authenticator",
    }));
  }

  if (enrollError || !data) return null;

  return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
}
