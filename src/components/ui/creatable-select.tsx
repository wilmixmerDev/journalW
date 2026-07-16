"use client";

import * as React from "react";
import { Combobox } from "@base-ui/react/combobox";
import { ChevronDown, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

const CREATE_PREFIX = "__create__:";

const popupClassName =
  "max-h-64 w-(--anchor-width) overflow-y-auto rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 py-1 z-50";
const emptyClassName = "px-2.5 py-2 text-sm text-muted-foreground";
const itemClassName =
  "flex cursor-default items-center gap-2 rounded-md px-2.5 py-1.5 text-sm outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground";

function renderItem(item: string) {
  return item.startsWith(CREATE_PREFIX) ? (
    <Combobox.Item key={item} value={item} className={itemClassName}>
      <Plus className="size-3.5 shrink-0" />
      Crear &quot;{item.slice(CREATE_PREFIX.length)}&quot;
    </Combobox.Item>
  ) : (
    <Combobox.Item key={item} value={item} className={itemClassName}>
      {item}
    </Combobox.Item>
  );
}

interface CreatableSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: string[];
  onCreate?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function CreatableSelect({
  value,
  onValueChange,
  options,
  onCreate,
  placeholder = "Selecciona",
  className,
  disabled = false,
}: CreatableSelectProps) {
  const [query, setQuery] = React.useState(value);

  // Si el valor cambia desde afuera (ej. al aplicar un favorito), refleja el texto en el input.
  const [prevValue, setPrevValue] = React.useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setQuery(value);
  }

  const trimmed = query.trim();
  const exactExists = options.some((o) => o.toLowerCase() === trimmed.toLowerCase());
  const items = trimmed && !exactExists ? [...options, `${CREATE_PREFIX}${trimmed}`] : options;

  function handleValueChange(next: string | null) {
    if (!next) {
      onValueChange("");
      setQuery("");
      return;
    }
    if (next.startsWith(CREATE_PREFIX)) {
      const name = next.slice(CREATE_PREFIX.length);
      onValueChange(name);
      onCreate?.(name);
      setQuery(name);
      return;
    }
    onValueChange(next);
    setQuery(next);
  }

  return (
    <Combobox.Root
      items={items}
      value={value || null}
      onValueChange={handleValueChange}
      inputValue={query}
      onInputValueChange={setQuery}
      disabled={disabled}
    >
      <Combobox.InputGroup
        className={cn(
          "flex h-8 w-full items-center gap-1 rounded-lg border border-input bg-transparent px-2.5 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30",
          disabled && "pointer-events-none opacity-50",
          className
        )}
      >
        <Combobox.Input
          placeholder={placeholder}
          className="h-full w-full flex-1 border-0 bg-transparent p-0 text-sm outline-none placeholder:text-muted-foreground"
        />
        <Combobox.Trigger className="flex shrink-0 items-center justify-center border-0 bg-transparent p-0 text-muted-foreground outline-none">
          <ChevronDown className="size-4" />
        </Combobox.Trigger>
      </Combobox.InputGroup>

      <Combobox.Portal>
        <Combobox.Positioner side="bottom" sideOffset={4} align="start" className="isolate z-50">
          <Combobox.Popup className={popupClassName}>
            <Combobox.Empty className={emptyClassName}>Sin resultados.</Combobox.Empty>
            <Combobox.List>{renderItem}</Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}

interface CreatableMultiSelectProps {
  value: string[];
  onValueChange: (value: string[]) => void;
  options: string[];
  onCreate?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function CreatableMultiSelect({
  value,
  onValueChange,
  options,
  onCreate,
  placeholder = "Agregar etiqueta...",
  className,
}: CreatableMultiSelectProps) {
  const [query, setQuery] = React.useState("");

  const trimmed = query.trim();
  const lowered = trimmed.toLowerCase();
  const alreadyUsed =
    options.some((o) => o.toLowerCase() === lowered) || value.some((v) => v.toLowerCase() === lowered);
  const availableOptions = options.filter((o) => !value.includes(o));
  const items = trimmed && !alreadyUsed ? [...availableOptions, `${CREATE_PREFIX}${trimmed}`] : availableOptions;

  function handleValueChange(next: string[]) {
    const creatable = next.find((v) => v.startsWith(CREATE_PREFIX));
    if (creatable) {
      const name = creatable.slice(CREATE_PREFIX.length);
      const clean = next.filter((v) => !v.startsWith(CREATE_PREFIX));
      onValueChange(clean.includes(name) ? clean : [...clean, name]);
      onCreate?.(name);
      setQuery("");
      return;
    }
    onValueChange(next);
    setQuery("");
  }

  return (
    <Combobox.Root
      items={items}
      multiple
      value={value}
      onValueChange={handleValueChange}
      inputValue={query}
      onInputValueChange={setQuery}
    >
      <Combobox.InputGroup
        className={cn(
          "flex min-h-8 w-full flex-wrap items-center gap-1 rounded-lg border border-input bg-transparent px-2 py-1 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30",
          className
        )}
      >
        <Combobox.Chips className="flex flex-1 flex-wrap items-center gap-1">
          <Combobox.Value>
            {(chips: string[]) => (
              <>
                {chips.map((chip) => (
                  <Combobox.Chip
                    key={chip}
                    aria-label={chip}
                    className="flex items-center gap-1 rounded-md bg-surface-2 py-0.5 pr-1 pl-1.5 text-xs text-ink outline-none select-none data-highlighted:bg-ink data-highlighted:text-bg"
                  >
                    {chip}
                    <Combobox.ChipRemove
                      aria-label={`Quitar ${chip}`}
                      className="flex size-3.5 items-center justify-center rounded-full border-0 bg-transparent p-0 text-ink-3 hover:bg-line hover:text-ink"
                    >
                      <X className="size-3" />
                    </Combobox.ChipRemove>
                  </Combobox.Chip>
                ))}
                <Combobox.Input
                  placeholder={chips.length ? "" : placeholder}
                  className="h-6 min-w-16 flex-1 border-0 bg-transparent p-0 text-sm outline-none placeholder:text-muted-foreground"
                />
              </>
            )}
          </Combobox.Value>
        </Combobox.Chips>
      </Combobox.InputGroup>

      <Combobox.Portal>
        <Combobox.Positioner side="bottom" sideOffset={4} align="start" className="isolate z-50">
          <Combobox.Popup className={popupClassName}>
            <Combobox.Empty className={emptyClassName}>Sin resultados.</Combobox.Empty>
            <Combobox.List>{renderItem}</Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
