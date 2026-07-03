"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function PasswordInput({ className, ...props }: Omit<React.ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input type={visible ? "text" : "password"} className={cn("pr-9", className)} {...props} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        className="absolute inset-y-0 right-0 flex items-center px-2.5 text-ink-3 transition-colors hover:text-ink-2"
      >
        <span key={visible ? "visible" : "hidden"} className="animate-fade-in flex">
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </span>
      </button>
    </div>
  );
}

export { PasswordInput };
