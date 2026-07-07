export const MARKETS = ["Forex", "Cripto", "Índices", "Acciones", "Materias primas", "Futuros"];

export const EXPERIENCE_LEVELS = [
  { value: "principiante", label: "Principiante" },
  { value: "intermedio", label: "Intermedio" },
  { value: "avanzado", label: "Avanzado" },
  { value: "profesional", label: "Profesional" },
] as const;

export const TIMEZONES = [
  { value: "America/Bogota", label: "Bogotá, Lima, Quito (UTC-5)" },
  { value: "America/Mexico_City", label: "Ciudad de México (UTC-6)" },
  { value: "America/Caracas", label: "Caracas (UTC-4)" },
  { value: "America/Santiago", label: "Santiago (UTC-4/-3)" },
  { value: "America/Argentina/Buenos_Aires", label: "Buenos Aires (UTC-3)" },
  { value: "America/New_York", label: "Nueva York (UTC-5/-4)" },
  { value: "Europe/Madrid", label: "Madrid (UTC+1/+2)" },
  { value: "UTC", label: "UTC" },
];
