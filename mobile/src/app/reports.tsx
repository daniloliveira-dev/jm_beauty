import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { API, useAuth, brl, today } from "../core";
import {
  Screen,
  EditorialHeader,
  Muted,
  Notice,
  colors,
} from "../components/ui";

type ChartMode = "day" | "week" | "month";
type FilterModal = "month" | "professional" | null;
type ReportData = {
  from: string;
  to: string;
  revenue: number;
  received: number;
  expenses: number;
  result: number;
  outstanding: number;
  attendances: number;
  appointments: any[];
};

function shiftMonth(month: string, amount: number): string {
  const date = new Date(`${month}-01T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + amount);
  return date.toISOString().slice(0, 7);
}

function monthRange(month: string): { from: string; to: string } {
  const [year, monthNumber] = month.split("-").map(Number);
  const days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(days).padStart(2, "0")}` };
}

function monthLabel(month: string): string {
  const label = new Date(`${month}-01T12:00:00Z`).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function dayKey(value: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function isCompleted(status: string): boolean {
  return ["concluido", "COMPLETED", "completed"].includes(status);
}

function isExcluded(status: string): boolean {
  return ["cancelado", "CANCELLED", "cancelled", "nao_compareceu", "NO_SHOW"].includes(status);
}

function professionalOf(appointment: any): number {
  return Number(appointment.professionalId ?? appointment.professional_id);
}

function serviceOf(appointment: any): string {
  return String(appointment.serviceName ?? appointment.service_name ?? "Serviço");
}

function scopedAppointments(data: ReportData | null, professionalId: number | "all"): any[] {
  const appointments = data?.appointments ?? [];
  return professionalId === "all"
    ? appointments
    : appointments.filter((appointment) => professionalOf(appointment) === professionalId);
}

function receivedForAppointments(appointments: any[], from: string, to: string): number {
  const inRange = (value: string) => {
    const day = dayKey(value);
    return day >= from && day <= to;
  };
  return appointments.reduce((total, appointment) => {
    const payments = appointment.payments ?? [];
    return total + payments.reduce((paymentTotal: number, payment: any) => {
      if (!payment.paidAt || !inRange(payment.paidAt)) return paymentTotal;
      const refunds = (payment.refunds ?? []).reduce(
        (sum: number, refund: any) => sum + (refund.createdAt && inRange(refund.createdAt) ? Number(refund.amount ?? 0) : 0),
        0,
      );
      return paymentTotal + Number(payment.amount ?? 0) - refunds;
    }, 0);
  }, 0);
}

function totalsFor(data: ReportData | null, professionalId: number | "all") {
  if (!data) return { revenue: 0, received: 0, expenses: 0, result: 0, outstanding: 0, attendances: 0 };
  if (professionalId === "all") {
    return {
      revenue: Number(data.revenue ?? 0),
      received: Number(data.received ?? 0),
      expenses: Number(data.expenses ?? 0),
      result: Number(data.result ?? 0),
      outstanding: Number(data.outstanding ?? 0),
      attendances: Number(data.attendances ?? 0),
    };
  }
  const appointments = scopedAppointments(data, professionalId);
  const revenue = appointments.filter((appointment) => isCompleted(appointment.status))
    .reduce((sum, appointment) => sum + Number(appointment.price ?? 0), 0);
  const outstanding = appointments.filter((appointment) => !isExcluded(appointment.status))
    .reduce((sum, appointment) => {
      const paid = (appointment.payments ?? []).reduce(
        (paymentSum: number, payment: any) => paymentSum + Number(payment.amount ?? 0) -
          (payment.refunds ?? []).reduce((refundSum: number, refund: any) => refundSum + Number(refund.amount ?? 0), 0),
        0,
      );
      return sum + Math.max(0, Number(appointment.price ?? 0) - paid);
    }, 0);
  const received = receivedForAppointments(appointments, data.from, data.to);
  const expenses = Number(data.expenses ?? 0);
  return {
    revenue,
    received,
    expenses,
    result: received - expenses,
    outstanding,
    attendances: appointments.filter((appointment) => isCompleted(appointment.status)).length,
  };
}

function serviceRanking(appointments: any[]) {
  const groups = new Map<string, { name: string; count: number; total: number }>();
  for (const appointment of appointments) {
    if (!isCompleted(appointment.status)) continue;
    const name = serviceOf(appointment);
    const group = groups.get(name) ?? { name, count: 0, total: 0 };
    group.count += 1;
    group.total += Number(appointment.price ?? 0);
    groups.set(name, group);
  }
  return [...groups.values()].sort((a, b) => b.total - a.total).slice(0, 5);
}

function chartSeries(appointments: any[], month: string, mode: ChartMode) {
  const daysInMonth = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();
  const totals = Array.from({ length: daysInMonth }, () => 0);
  for (const appointment of appointments) {
    if (!isCompleted(appointment.status)) continue;
    const day = dayKey(appointment.start).slice(-2);
    const index = Number(day) - 1;
    if (index >= 0 && index < totals.length) totals[index] += Number(appointment.price ?? 0);
  }
  if (mode === "day") return totals.map((value, index) => ({ label: String(index + 1), value }));
  if (mode === "month") return [{ label: monthLabel(month).split(" ")[0].slice(0, 3), value: totals.reduce((sum, value) => sum + value, 0) }];
  const weeks = Array.from({ length: Math.ceil(daysInMonth / 7) }, (_, index) => ({ label: `S${index + 1}`, value: 0 }));
  totals.forEach((value, index) => { weeks[Math.floor(index / 7)].value += value; });
  return weeks;
}

function axisLabel(valueInCents: number): string {
  const value = valueInCents / 100;
  return value >= 1000 ? `${Math.round(value / 1000)} mil` : String(Math.round(value));
}

function MetricCard({
  icon,
  label,
  value,
  detail,
  iconColor,
  valueColor = colors.text,
  compact,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  detail: string;
  iconColor: string;
  valueColor?: string;
  compact: boolean;
}) {
  return (
    <View style={[styles.metricCard, compact && styles.metricCardCompact]}>
      <View style={[styles.metricIcon, { backgroundColor: `${iconColor}25` }]}>
        <Ionicons name={icon} size={21} color={iconColor} />
      </View>
      <View style={styles.metricCopy}>
        <Text style={styles.metricLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{label}</Text>
        <Text style={[styles.metricValue, { color: valueColor }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>{value}</Text>
        <Text style={styles.metricDetail} numberOfLines={1}>{detail}</Text>
      </View>
    </View>
  );
}

export default function Reports() {
  const { request, session } = useAuth();
  const { width } = useWindowDimensions();
  const [month, setMonth] = useState(today().slice(0, 7));
  const [professionalId, setProfessionalId] = useState<number | "all">("all");
  const [filterModal, setFilterModal] = useState<FilterModal>(null);
  const [chartMode, setChartMode] = useState<ChartMode>("day");
  const [data, setData] = useState<ReportData | null>(null);
  const [previousData, setPreviousData] = useState<ReportData | null>(null);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const compact = width < 380;
  const range = monthRange(month);

  const load = useCallback(async () => {
    if (session?.user.role !== "admin") return;
    const previousRange = monthRange(shiftMonth(month, -1));
    setBusy(true);
    setError("");
    try {
      const [current, previous, people] = await Promise.all([
        request(`/reports?from=${range.from}&to=${range.to}`),
        request(`/reports?from=${previousRange.from}&to=${previousRange.to}`),
        request("/professionals"),
      ]);
      setData(current);
      setPreviousData(previous);
      setProfessionals(people.filter((person: any) => person.active !== 0));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [month, range.from, range.to, request, session?.user.role]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function download(format: "pdf" | "csv") {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(
        `${API}/reports?from=${range.from}&to=${range.to}&format=${format}`,
        { headers: { Authorization: "Bearer " + session?.token } },
      );
      if (!res.ok) throw Error("Não foi possível exportar");
      const bytes = new Uint8Array(await res.arrayBuffer());
      const name = `relatorio-${month}.${format}`;
      if (Platform.OS === "web") {
        const blob = new Blob([bytes], { type: format === "pdf" ? "application/pdf" : "text/csv" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = name;
        anchor.click();
        URL.revokeObjectURL(url);
      } else {
        const file = new File(Paths.cache, name);
        file.create({ overwrite: true });
        file.write(bytes);
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(file.uri, { mimeType: format === "pdf" ? "application/pdf" : "text/csv" });
        } else {
          throw Error("Compartilhamento indisponível neste aparelho");
        }
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const totals = totalsFor(data, professionalId);
  const previousTotals = totalsFor(previousData, professionalId);
  const growth = previousTotals.revenue > 0
    ? ((totals.revenue - previousTotals.revenue) / previousTotals.revenue) * 100
    : null;
  const revenuePercent = totals.revenue > 0 ? Math.round((totals.received / totals.revenue) * 100) : 0;
  const pendingPercent = totals.revenue > 0 ? Math.round((totals.outstanding / totals.revenue) * 100) : 0;
  const marginPercent = totals.revenue > 0 ? Math.round((totals.result / totals.revenue) * 100) : 0;
  const appointments = scopedAppointments(data, professionalId);
  const ranking = serviceRanking(appointments);
  const series = chartSeries(appointments, month, chartMode);
  const chartMaximum = Math.max(100000, Math.ceil(Math.max(0, ...series.map((point) => point.value)) / 100000) * 100000);
  const monthOptions = Array.from({ length: 12 }, (_, index) => shiftMonth(month, -index));
  const chosenProfessional = professionals.find((person) => person.id === professionalId);

  return (
    <Screen admin title="Relatórios" dashboard busy={busy && !data}>
      <EditorialHeader title="Relatórios" subtitle="Acompanhe o desempenho do seu salão" />
      <Notice error message={error} />

      <View style={styles.filtersRow}>
        <Pressable accessibilityRole="button" onPress={() => setFilterModal("month")} style={styles.filterButton}>
          <Ionicons name="calendar-outline" size={21} color={colors.accent} />
          <Text style={styles.filterLabel} numberOfLines={1}>{monthLabel(month)}</Text>
          <Ionicons name="chevron-down" size={17} color={colors.muted} />
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => setFilterModal("professional")} style={styles.filterButton}>
          <Ionicons name="people-outline" size={21} color={colors.muted} />
          <Text style={styles.filterLabel} numberOfLines={1}>
            {professionalId === "all" ? "Todos os profissionais" : chosenProfessional?.name ?? "Profissional"}
          </Text>
          <Ionicons name="chevron-down" size={17} color={colors.muted} />
        </Pressable>
      </View>

      <View style={styles.metricsGrid}>
        <MetricCard
          icon="bar-chart"
          label="Faturamento"
          value={brl(totals.revenue)}
          detail={growth === null ? "Sem comparativo anterior" : `${growth >= 0 ? "+" : ""}${growth.toFixed(1).replace(".", ",")}% vs ${monthLabel(shiftMonth(month, -1)).split(" ")[0].toLowerCase()}`}
          iconColor={colors.accent}
          valueColor={colors.text}
          compact={compact}
        />
        <MetricCard
          icon="wallet"
          label="Recebido"
          value={brl(totals.received)}
          detail={`${revenuePercent}% do faturamento`}
          iconColor="#83c64c"
          compact={compact}
        />
        <MetricCard
          icon="time-outline"
          label="Pendente"
          value={brl(totals.outstanding)}
          detail={`${pendingPercent}% do faturamento`}
          iconColor="#e7a33c"
          compact={compact}
        />
        <MetricCard
          icon="bar-chart-outline"
          label="Resultado"
          value={brl(totals.result)}
          detail={`${marginPercent}% de margem`}
          iconColor="#9a9aa3"
          compact={compact}
        />
      </View>

      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Faturamento diário</Text>
          <View style={styles.chartTabs}>
            {([
              ["day", "Dia"],
              ["week", "Semana"],
              ["month", "Mês"],
            ] as [ChartMode, string][]).map(([mode, label]) => (
              <Pressable key={mode} onPress={() => setChartMode(mode)} style={[styles.chartTab, chartMode === mode && styles.chartTabActive]}>
                <Text style={[styles.chartTabText, chartMode === mode && styles.chartTabTextActive]}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <Text style={styles.growthText}>
          {growth === null ? "Comparativo mensal indisponível" : `${growth >= 0 ? "+" : ""}${growth.toFixed(1).replace(".", ",")}% vs ${monthLabel(shiftMonth(month, -1)).split(" ")[0].toLowerCase()}`}
        </Text>

        <View style={styles.chartBody}>
          <View style={styles.chartAxis}>
            <Text style={styles.axisText}>{axisLabel(chartMaximum)}</Text>
            <Text style={styles.axisText}>{axisLabel(chartMaximum * 2 / 3)}</Text>
            <Text style={styles.axisText}>{axisLabel(chartMaximum / 3)}</Text>
            <Text style={styles.axisText}>0</Text>
          </View>
          <View style={styles.chartMain}>
            <View style={styles.chartPlot}>
              <View style={[styles.gridLine, { top: "0%" }]} />
              <View style={[styles.gridLine, { top: "33%" }]} />
              <View style={[styles.gridLine, { top: "66%" }]} />
              <View style={styles.barsRow}>
                {series.map((point, index) => (
                  <View key={`${point.label}-${index}`} style={styles.barCell}>
                    <View
                      style={[
                        styles.bar,
                        { height: `${Math.max(point.value ? 3 : 0, (point.value / chartMaximum) * 100)}%` },
                        series.length > 14 && styles.barNarrow,
                      ]}
                    />
                  </View>
                ))}
              </View>
            </View>
            <View style={styles.chartLabels}>
              {series.map((point, index) => (
                <View key={`${point.label}-label-${index}`} style={styles.chartLabelCell}>
                  {(chartMode !== "day" || index === 0 || (index + 1) % 5 === 0 || index === series.length - 1) && (
                    <Text style={styles.chartLabelText}>{point.label}</Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>

      <View style={styles.servicesCard}>
        <View style={styles.servicesHeader}>
          <Text style={styles.servicesTitle}>Principais serviços por faturamento</Text>
          <Pressable accessibilityRole="button" onPress={() => router.push("/manage")} style={styles.seeAll}>
            <Text style={styles.seeAllText}>Ver todos</Text>
            <Ionicons name="chevron-forward" size={17} color={colors.accent} />
          </Pressable>
        </View>
        {ranking.map((service, index) => (
          <View key={service.name} style={[styles.serviceRow, index === ranking.length - 1 && styles.lastServiceRow]}>
            <View style={[styles.rank, index === 0 && styles.rankTop]}>
              <Text style={styles.rankText}>{index + 1}</Text>
            </View>
            <Text style={styles.serviceName} numberOfLines={1}>{service.name}</Text>
            <Text style={styles.serviceAmount}>{brl(service.total)}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </View>
        ))}
        {!ranking.length && <Muted>Nenhum serviço concluído neste período.</Muted>}
      </View>

      <View style={styles.exportRow}>
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => download("pdf")} style={({ pressed }) => [styles.exportButton, pressed && styles.pressed]}>
          <Ionicons name="document-outline" size={18} color={colors.accent} />
          <Text style={styles.exportText}>Exportar PDF</Text>
        </Pressable>
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => download("csv")} style={({ pressed }) => [styles.exportButton, pressed && styles.pressed]}>
          <Ionicons name="grid-outline" size={18} color={colors.accent} />
          <Text style={styles.exportText}>Exportar CSV</Text>
        </Pressable>
      </View>
      {professionalId !== "all" && (
        <Text style={styles.filterNote}>Despesas e resultado consideram o salão; o filtro de profissional afeta os atendimentos.</Text>
      )}

      <Modal transparent animationType="slide" visible={filterModal !== null} onRequestClose={() => setFilterModal(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setFilterModal(null)}>
          <Pressable style={styles.modalSheet} onPress={(event) => event.stopPropagation()}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{filterModal === "month" ? "Selecione o mês" : "Selecione o profissional"}</Text>
            <ScrollView style={styles.modalOptions}>
              {filterModal === "month" ? monthOptions.map((option) => (
                <Pressable key={option} onPress={() => { setMonth(option); setFilterModal(null); }} style={styles.modalOption}>
                  <Text style={[styles.modalOptionText, option === month && styles.modalOptionSelected]}>{monthLabel(option)}</Text>
                  {option === month && <Ionicons name="checkmark" size={20} color={colors.accent} />}
                </Pressable>
              )) : [
                { id: "all" as const, name: "Todos os profissionais" },
                ...professionals.map((person) => ({ id: person.id as number, name: person.name as string })),
              ].map((person) => (
                <Pressable key={person.id} onPress={() => { setProfessionalId(person.id); setFilterModal(null); }} style={styles.modalOption}>
                  <Text style={[styles.modalOptionText, person.id === professionalId && styles.modalOptionSelected]}>{person.name}</Text>
                  {person.id === professionalId && <Ionicons name="checkmark" size={20} color={colors.accent} />}
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = {
  filtersRow: { flexDirection: "row" as const, gap: 9 },
  filterButton: {
    flex: 1 as const,
    minWidth: 0 as const,
    minHeight: 48,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: "#1a181b",
  },
  filterLabel: { flex: 1 as const, minWidth: 0 as const, color: colors.text, fontSize: 13 },
  metricsGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    justifyContent: "space-between" as const,
    rowGap: 9,
  },
  metricCard: {
    width: "48.5%" as const,
    minHeight: 111,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    padding: 13,
    borderRadius: 20,
    backgroundColor: "#1a181b",
  },
  metricCardCompact: { width: "100%" as const, minHeight: 88 },
  metricIcon: {
    width: 43,
    height: 43,
    borderRadius: 24,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  metricCopy: { flex: 1 as const, minWidth: 0 as const, gap: 3 },
  metricLabel: { color: colors.muted, fontSize: 13 },
  metricValue: { fontSize: 20, lineHeight: 26, fontWeight: "600" as const },
  metricDetail: { color: colors.muted, fontSize: 12 },
  chartCard: { padding: 17, borderRadius: 20, backgroundColor: "#1a181b", gap: 8 },
  chartHeader: { flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "space-between" as const, gap: 8 },
  chartTitle: { flexShrink: 1 as const, color: colors.text, fontSize: 15, fontWeight: "600" as const },
  chartTabs: { flexDirection: "row" as const, padding: 3, borderRadius: 22, backgroundColor: "#252226" },
  chartTab: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 18 },
  chartTabActive: { backgroundColor: colors.accent },
  chartTabText: { color: colors.muted, fontSize: 11 },
  chartTabTextActive: { color: "#fff", fontWeight: "600" as const },
  growthText: { color: colors.accent, fontSize: 13, marginTop: -2 },
  chartBody: { height: 147, flexDirection: "row" as const, gap: 8, marginTop: 4 },
  chartAxis: { width: 37, justifyContent: "space-between" as const, paddingBottom: 16 },
  axisText: { color: colors.muted, fontSize: 10, textAlign: "right" as const },
  chartMain: { flex: 1 as const, minWidth: 0 as const },
  chartPlot: { flex: 1 as const, position: "relative" as const, borderBottomWidth: 1, borderBottomColor: "#5a5059" },
  gridLine: { position: "absolute" as const, left: 0, right: 0, borderTopWidth: 1, borderStyle: "dashed" as const, borderColor: "#39333a" },
  barsRow: { ...({ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 } as const), flexDirection: "row" as const, alignItems: "flex-end" as const },
  barCell: { flex: 1 as const, height: "100%" as const, alignItems: "center" as const, justifyContent: "flex-end" as const },
  bar: { width: "62%" as const, minHeight: 2, borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: colors.accent },
  barNarrow: { width: "58%" as const },
  chartLabels: { height: 18, flexDirection: "row" as const, alignItems: "flex-start" as const },
  chartLabelCell: { flex: 1 as const, alignItems: "center" as const },
  chartLabelText: { color: colors.muted, fontSize: 9 },
  servicesCard: { paddingHorizontal: 16, paddingTop: 15, paddingBottom: 4, borderRadius: 20, backgroundColor: "#1a181b" },
  servicesHeader: { minHeight: 34, flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "space-between" as const, gap: 6, marginBottom: 4 },
  servicesTitle: { flexShrink: 1 as const, color: colors.text, fontSize: 14, fontWeight: "600" as const },
  seeAll: { flexDirection: "row" as const, alignItems: "center" as const, gap: 2 },
  seeAllText: { color: colors.accent, fontSize: 13 },
  serviceRow: { minHeight: 52, flexDirection: "row" as const, alignItems: "center" as const, gap: 12, borderBottomWidth: 1, borderBottomColor: "#302b31" },
  lastServiceRow: { borderBottomWidth: 0 },
  rank: { width: 32, height: 32, borderRadius: 18, alignItems: "center" as const, justifyContent: "center" as const, backgroundColor: "#444148" },
  rankTop: { backgroundColor: "#783e61" },
  rankText: { color: colors.text, fontSize: 13, fontWeight: "600" as const },
  serviceName: { flex: 1 as const, minWidth: 0 as const, color: colors.text, fontSize: 14 },
  serviceAmount: { color: colors.text, fontSize: 14, fontWeight: "500" as const },
  exportRow: { flexDirection: "row" as const, flexWrap: "wrap" as const, justifyContent: "space-between" as const, gap: 9, paddingHorizontal: 7 },
  exportButton: { width: "48.5%" as const, minHeight: 48, flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "center" as const, gap: 8, borderWidth: 1, borderColor: colors.accent, borderRadius: 17 },
  exportText: { color: colors.accent, fontSize: 14, fontWeight: "500" as const },
  filterNote: { color: colors.muted, fontSize: 11, lineHeight: 16, paddingHorizontal: 4 },
  pressed: { opacity: 0.7 },
  modalBackdrop: { flex: 1, justifyContent: "flex-end" as const, backgroundColor: "rgba(0,0,0,0.65)" },
  modalSheet: { maxHeight: "75%" as const, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32, borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: "#1a181b" },
  modalHandle: { width: 42, height: 4, alignSelf: "center" as const, borderRadius: 3, backgroundColor: "#5a5059", marginBottom: 16 },
  modalTitle: { color: colors.text, fontSize: 19, fontWeight: "600" as const, marginBottom: 8 },
  modalOptions: { flexGrow: 0 as const },
  modalOption: { minHeight: 52, flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "space-between" as const, borderBottomWidth: 1, borderBottomColor: "#302b31" },
  modalOptionText: { color: colors.text, fontSize: 15 },
  modalOptionSelected: { color: colors.accent, fontWeight: "600" as const },
};