import { Document, Page, View, Text, StyleSheet, pdf, Svg, Rect, Line, Path } from "@react-pdf/renderer";
import { computeMetrics } from "@/lib/metrics";
import type { Trade } from "@/types/trade";
import type { Profile } from "@/types/profile";
import type { DataExportInput } from "@/lib/data-export";

const COLORS = {
  bg: "#F4F1EA",
  surface: "#FBFAF6",
  ink: "#1C1A16",
  inkSoft: "#57534A",
  inkFaint: "#928C80",
  line: "#E5E0D5",
  gold: "#9A7B3F",
  pos: "#2F7D54",
  neg: "#B0392E",
};

const styles = StyleSheet.create({
  page: { padding: 32, fontFamily: "Helvetica", fontSize: 9, color: COLORS.ink, backgroundColor: COLORS.bg },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 24 },
  badge: { width: 30, height: 30, marginRight: 10 },
  headerText: { flexDirection: "column" },
  title: { fontSize: 18, fontFamily: "Helvetica-Bold" },
  subtitle: { fontSize: 8, color: COLORS.inkSoft, marginTop: 2 },
  sectionTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", marginTop: 18, marginBottom: 8 },
  profileRow: { flexDirection: "row", flexWrap: "wrap" },
  profileItem: { width: "33%", marginBottom: 8 },
  profileLabel: { fontSize: 7, color: COLORS.inkFaint, textTransform: "uppercase", marginBottom: 2 },
  profileValue: { fontSize: 10 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap" },
  statCard: {
    width: "23.5%",
    marginRight: "2%",
    marginBottom: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 8,
  },
  statLabel: { fontSize: 7, color: COLORS.inkFaint, textTransform: "uppercase", marginBottom: 3 },
  statValue: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  table: {
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 6,
    overflow: "hidden",
  },
  tableHeaderRow: { flexDirection: "row", alignItems: "center", paddingVertical: 7, backgroundColor: COLORS.ink },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
  },
  tableRowAlt: { backgroundColor: COLORS.surface },
  colDate: { width: "15%" },
  colInstrument: { width: "21%" },
  colDirection: { width: "14%" },
  colResult: { width: "20%" },
  colR: { width: "15%", textAlign: "right" },
  colPnl: { width: "15%", textAlign: "right" },
  cellPad: { paddingHorizontal: 8 },
  th: { fontSize: 7, color: COLORS.bg, textTransform: "uppercase", letterSpacing: 0.5 },
  td: { fontSize: 8.5 },
  directionPill: {
    alignSelf: "flex-start",
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  directionPillText: { fontSize: 7.5, fontFamily: "Helvetica-Bold" },
  footer: { position: "absolute", bottom: 20, left: 32, right: 32, fontSize: 7, color: COLORS.inkFaint },
});

/** Mismo isotipo que public/brand/icon-light.svg, reproducido con las primitivas de react-pdf. */
function BrandIcon() {
  return (
    <Svg viewBox="0 0 64 64" style={styles.badge}>
      <Rect x={4} y={4} width={56} height={56} rx={16} fill={COLORS.ink} />
      <Line x1={14} y1={47} x2={50} y2={47} stroke={COLORS.bg} strokeWidth={2.6} strokeLinecap="round" opacity={0.45} />
      <Path
        d="M15 22l4.5 18L26 28l5 12"
        stroke={COLORS.bg}
        strokeWidth={3.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M31 40l6-14 7-11"
        stroke={COLORS.gold}
        strokeWidth={3.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path d="M39 15h6v6" stroke={COLORS.gold} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

function statTone(value: number): string {
  return value >= 0 ? COLORS.pos : COLORS.neg;
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, color ? { color } : {}]}>{value}</Text>
    </View>
  );
}

const RESULT_LABELS: Record<string, string> = {
  tp: "Take Profit",
  sl: "Stop Loss",
  be: "Break Even",
  open: "Abierta",
};

function resultTone(t: Trade): string {
  if (t.resultType === "tp") return COLORS.pos;
  if (t.resultType === "sl") return COLORS.neg;
  return COLORS.inkFaint;
}

function formatTradeRow(t: Trade) {
  const date = t.enteredAt?.slice(0, 10) ?? "?";
  const r = t.rMultiple !== null ? `${t.rMultiple >= 0 ? "+" : ""}${t.rMultiple.toFixed(2)}R` : "—";
  const pnl = t.pnl !== null ? `${t.pnl >= 0 ? "+" : ""}${t.pnl.toFixed(2)}%` : "—";
  const resultKey = t.resultType ?? t.status;
  return {
    date,
    instrument: t.instrument,
    isLong: t.direction === "long",
    result: RESULT_LABELS[resultKey] ?? resultKey,
    resultColor: resultTone(t),
    r,
    pnl,
    pnlValue: t.pnl ?? 0,
  };
}

function TradesTable({ trades }: { trades: Trade[] }) {
  const sorted = trades.slice().sort((a, b) => (a.enteredAt < b.enteredAt ? 1 : -1));

  return (
    <View style={styles.table}>
      <View style={styles.tableHeaderRow}>
        <Text style={[styles.th, styles.cellPad, styles.colDate]}>Fecha</Text>
        <Text style={[styles.th, styles.cellPad, styles.colInstrument]}>Instrumento</Text>
        <Text style={[styles.th, styles.cellPad, styles.colDirection]}>Dirección</Text>
        <Text style={[styles.th, styles.cellPad, styles.colResult]}>Resultado</Text>
        <Text style={[styles.th, styles.cellPad, styles.colR]}>R</Text>
        <Text style={[styles.th, styles.cellPad, styles.colPnl]}>PnL%</Text>
      </View>
      {sorted.map((trade, i) => {
        const row = formatTradeRow(trade);
        return (
          <View key={trade.id} style={i % 2 === 1 ? [styles.tableRow, styles.tableRowAlt] : styles.tableRow}>
            <Text style={[styles.td, styles.cellPad, styles.colDate]}>{row.date}</Text>
            <Text style={[styles.td, styles.cellPad, styles.colInstrument]}>{row.instrument}</Text>
            <View style={[styles.cellPad, styles.colDirection]}>
              <View
                style={[
                  styles.directionPill,
                  row.isLong ? { backgroundColor: COLORS.ink } : { borderWidth: 1, borderColor: COLORS.inkFaint },
                ]}
              >
                <Text style={[styles.directionPillText, { color: row.isLong ? COLORS.bg : COLORS.inkSoft }]}>
                  {row.isLong ? "Long" : "Short"}
                </Text>
              </View>
            </View>
            <Text style={[styles.td, styles.cellPad, styles.colResult, { color: row.resultColor }]}>{row.result}</Text>
            <Text style={[styles.td, styles.cellPad, styles.colR, { color: statTone(trade.rMultiple ?? 0) }]}>{row.r}</Text>
            <Text style={[styles.td, styles.cellPad, styles.colPnl, { color: statTone(row.pnlValue) }]}>{row.pnl}</Text>
          </View>
        );
      })}
    </View>
  );
}

interface TradingReportProps {
  profile: Profile;
  email: string | null;
  live: Trade[];
  backtest: Trade[];
}

function TradingReportDocument({ profile, email, live, backtest }: TradingReportProps) {
  const summary = computeMetrics(live);
  const name = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || email || "Trader";
  const exportedAt = new Date().toLocaleDateString("es", { year: "numeric", month: "long", day: "numeric" });

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header}>
          <BrandIcon />
          <View style={styles.headerText}>
            <Text style={styles.title}>Reporte de Trading — {name}</Text>
            <Text style={styles.subtitle}>Journal W · Generado el {exportedAt}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Perfil</Text>
        <View style={styles.profileRow}>
          <View style={styles.profileItem}>
            <Text style={styles.profileLabel}>Experiencia</Text>
            <Text style={styles.profileValue}>{profile.experienceLevel ?? "—"}</Text>
          </View>
          <View style={styles.profileItem}>
            <Text style={styles.profileLabel}>Mercados</Text>
            <Text style={styles.profileValue}>{profile.markets.length ? profile.markets.join(", ") : "—"}</Text>
          </View>
          <View style={styles.profileItem}>
            <Text style={styles.profileLabel}>Capital inicial</Text>
            <Text style={styles.profileValue}>{profile.initialCapital ?? "—"}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Resumen — journal en vivo</Text>
        <View style={styles.statsGrid}>
          <StatCard label="Operaciones" value={String(summary.totalTrades)} />
          <StatCard label="Ganadas / Perdidas / BE" value={`${summary.wins} / ${summary.losses} / ${summary.breakeven}`} />
          <StatCard label="Win rate" value={`${summary.winRate.toFixed(1)}%`} />
          <StatCard
            label="PnL neto"
            value={`${summary.netPnl >= 0 ? "+" : ""}${summary.netPnl.toFixed(2)}%`}
            color={statTone(summary.netPnl)}
          />
          <StatCard label="Expectancy" value={summary.expectancy.toFixed(2)} />
          <StatCard
            label="Profit factor"
            value={summary.profitFactor !== null ? summary.profitFactor.toFixed(2) : "—"}
          />
          <StatCard
            label="Total R"
            value={`${summary.totalR >= 0 ? "+" : ""}${summary.totalR.toFixed(2)}R`}
            color={statTone(summary.totalR)}
          />
          <StatCard label="R promedio" value={`${summary.avgR.toFixed(2)}R`} />
          <StatCard label="R prom. ganadoras" value={`${summary.avgWinR.toFixed(2)}R`} color={COLORS.pos} />
          <StatCard label="R prom. perdedoras" value={`${summary.avgLossR.toFixed(2)}R`} color={COLORS.neg} />
          <StatCard
            label="Risk / Reward"
            value={summary.riskReward !== null ? summary.riskReward.toFixed(2) : "—"}
          />
          <StatCard label="Máx. drawdown" value={`${summary.maxDrawdown.toFixed(2)}%`} />
          <StatCard label="Disciplina" value={`${summary.disciplineScore.toFixed(1)}%`} />
          <StatCard
            label="Racha actual"
            value={summary.currentStreak === 0 ? "—" : `${summary.currentStreak > 0 ? "+" : ""}${summary.currentStreak}`}
          />
          <StatCard label="Mejor racha ganadora" value={String(summary.bestWinStreak)} color={COLORS.pos} />
          <StatCard label="Peor racha perdedora" value={String(summary.worstLossStreak)} color={COLORS.neg} />
        </View>

        {live.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Operaciones — journal en vivo</Text>
            <TradesTable trades={live} />
          </>
        ) : null}

        {backtest.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Operaciones — backtesting</Text>
            <TradesTable trades={backtest} />
          </>
        ) : null}

        <Text style={styles.footer} fixed>
          Journal W — reporte generado por el usuario, solo para uso personal.
        </Text>
      </Page>
    </Document>
  );
}

export async function downloadTradingReportPdf({ profile, email, live, backtest }: DataExportInput): Promise<void> {
  const blob = await pdf(
    <TradingReportDocument profile={profile} email={email} live={live} backtest={backtest} />
  ).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `journalw-reporte-${new Date().toISOString().slice(0, 10)}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}
