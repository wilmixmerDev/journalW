"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius-xl)",
        } as React.CSSProperties
      }
      toastOptions={{
        unstyled: false,
        classNames: {
          toast: "cn-toast !rounded-xl !shadow-lg !gap-3 !items-start",
          title: "font-serif text-[15px] font-normal leading-snug",
          description: "!text-ink-2 !text-xs",
          icon: "!mt-0.5",
          success: "!border-pos/30 !bg-pos-soft [&_[data-title]]:!text-pos [&_svg]:!text-pos",
          error: "!border-neg/30 !bg-neg-soft [&_[data-title]]:!text-neg [&_svg]:!text-neg",
          warning: "!border-gold/30 !bg-gold-soft [&_[data-title]]:!text-gold [&_svg]:!text-gold",
          info: "!border-line !bg-surface-2 [&_[data-title]]:!text-ink [&_svg]:!text-ink-2",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
