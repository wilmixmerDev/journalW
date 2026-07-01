export interface DisciplineItem {
  id: string;
  label: string;
}

export const DISCIPLINE_ITEMS: DisciplineItem[] = [
  { id: "waited_zone", label: "Esperé mi zona." },
  { id: "entry_rules", label: "La entrada cumplía mis reglas." },
  { id: "respected_risk", label: "Respeté el riesgo." },
  { id: "no_moved_sl", label: "No moví el Stop Loss." },
  { id: "no_impulse", label: "No operé por impulso." },
  { id: "no_news", label: "No había noticias importantes." },
  { id: "followed_plan", label: "Seguí completamente mi plan." },
];

export function computeDisciplineScore(checked: string[]): number {
  if (DISCIPLINE_ITEMS.length === 0) return 0;
  return Math.round((checked.length / DISCIPLINE_ITEMS.length) * 100);
}
