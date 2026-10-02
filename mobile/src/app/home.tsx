import React, { useState, useCallback } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth, brl, today } from "../core";
import {
  Screen,
  Muted,
  Notice,
  colors,
} from "../components/ui";

type MetricCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  detail: string;
  onPress: () => void;
  compact: boolean;
  valueColor?: string;
  iconColor?: string;
};

function MetricCard({
  icon,
  label,
  value,
  detail,
  onPress,
  compact,
  valueColor = colors.text,
  iconColor = colors.accent,
}: MetricCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.metricCard,
        compact && styles.metricCardCompact,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.metricIcon, { backgroundColor: `${iconColor}24` }]}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <View style={styles.metricContent}>
        <Text
          style={styles.metricLabel}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {label}
        </Text>
        <Text
          style={[styles.metricValue, { color: valueColor }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
        >
          {value}
        </Text>
        <Text style={styles.metricDetail} numberOfLines={1}>
          {detail}
        </Text>
      </View>
      {label !== "Serviços realizados" && (
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      )}
    </Pressable>
  );
}

function percentage(value: number, total: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((value / total) * 100)));
}

function timeOf(value: string): string {
  return new Date(value).toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function greeting(): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(new Date()),
  );
  return hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
}

function todayLabel(): string {
  const date = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
  return date.charAt(0).toLowerCase() + date.slice(1);
}

export default function Home() {
  const { session, request } = useAuth();
  const { width } = useWindowDimensions();
  const [data, setData] = useState<any>(null),
    [cash, setCash] = useState<any>(null),
    [error, setError] = useState(""),
    [now, setNow] = useState(0);
  const compact = width < 380;
  const appointments = (data?.appointments ?? []) as any[];
  const gross = Number(data?.revenue ?? 0);
  const received = Number(data?.received ?? 0);
  const outstanding = Number(data?.outstanding ?? 0);
  const expenses = Number(data?.expenses ?? 0);
  const collectionRate = percentage(received, received + outstanding);
  const expenseRate = percentage(expenses, gross);
  const pendingCount = appointments.filter((appointment) => {
    const excluded = ["cancelado", "CANCELLED", "cancelled", "nao_compareceu", "NO_SHOW"];
    if (excluded.includes(appointment.status)) return false;
    const paid = (appointment.payments ?? []).reduce(
      (sum: number, payment: any) =>
        sum + Number(payment.amount ?? 0) - (payment.refunds ?? []).reduce(
          (refunds: number, refund: any) => refunds + Number(refund.amount ?? 0),
          0,
        ),
      0,
    );
    return Number(appointment.price ?? 0) > paid;
  }).length;
  const upcoming = appointments
    .filter((appointment) => {
      const cancelled = ["cancelado", "CANCELLED", "cancelled", "nao_compareceu", "NO_SHOW"];
      return !cancelled.includes(appointment.status) && new Date(appointment.start).getTime() >= now;
    })
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, 4);
  const firstName = session?.user.name.trim().split(/\s+/)[0] || "Josiane";
  const cashOpen = cash?.status === "aberto";
  const cashValue = cash?.expected ?? cash?.initial ?? 0;
  const cashLabel = cashOpen
    ? "Saldo inicial"
    : cash?.expected !== null && cash?.expected !== undefined
      ? "Dinheiro esperado"
      : "Caixa ainda não aberto";

  useFocusEffect(
    useCallback(() => {
      if (session?.user.role !== "admin") return;
      setNow(Date.now());
      setError("");
      Promise.all([
        request(`/reports?from=${today()}&to=${today()}`),
        request("/cash"),
      ])
        .then(([r, c]) => {
          setData(r);
          setCash(c.find((x: any) => x.date === today()));
        })
        .catch((e) => setError(e.message));
    }, [session, request]),
  );
  return (
    <Screen admin dashboard title="" busy={!data && !error}>
      <View style={styles.dashboardHeader}>
        <View style={styles.headerCopy}>
          <Text style={styles.brand}>ESPAÇO JOSIANE MARINE</Text>
          <Text style={[styles.greeting, { fontSize: Math.min(39, width * 0.1) }]}>
            {greeting()}, {firstName}
          </Text>
          <Text style={styles.date}>{todayLabel()}</Text>
        </View>
        <Text accessibilityLabel="Espaço Josiane Marine" style={styles.monogram}>
          M
        </Text>
      </View>

      <Notice error message={error} />

      <View style={styles.metricsGrid}>
        <MetricCard
          icon="cut-outline"
          label="Serviços realizados"
          value={brl(gross)}
          detail={`${Number(data?.attendances ?? 0)} atendimentos`}
          onPress={() => router.push("/reports")}
          compact={compact}
        />
        <MetricCard
          icon="wallet-outline"
          label="Recebido"
          value={brl(received)}
          detail={`${collectionRate}% do dia`}
          valueColor={colors.accent}
          onPress={() => router.push("/reports")}
          compact={compact}
        />
        <MetricCard
          icon="time-outline"
          label="Pendente"
          value={brl(outstanding)}
          detail={`${pendingCount} atendimentos`}
          iconColor="#e7a33c"
          onPress={() => router.push("/appointments")}
          compact={compact}
        />
        <MetricCard
          icon="bar-chart-outline"
          label="Despesas"
          value={brl(expenses)}
          detail={`${expenseRate}% da receita`}
          iconColor="#9a9aa3"
          onPress={() => router.push("/reports")}
          compact={compact}
        />
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push("/cash")}
        style={({ pressed }) => [styles.cashCard, pressed && styles.pressed]}
      >
        <View style={styles.cashIcon}>
          <Ionicons name="cash-outline" size={23} color={colors.accent} />
        </View>
        <View style={styles.cashCopy}>
          <Text style={styles.cashTitle}>
            {cashOpen ? "Caixa aberto" : cash ? "Caixa do dia" : "Caixa"}
          </Text>
          <Text style={styles.cashLabel}>{cashLabel}</Text>
          <Text style={styles.cashValue}>{brl(Number(cashValue))}</Text>
        </View>
        <View style={styles.progressWrap}>
          <View
            style={[
              styles.progressRing,
              {
                borderTopColor: collectionRate > 0 ? colors.accent : colors.border,
                borderRightColor: collectionRate >= 25 ? colors.accent : colors.border,
                borderBottomColor: collectionRate >= 50 ? colors.accent : colors.border,
                borderLeftColor: collectionRate >= 75 ? colors.accent : colors.border,
              },
            ]}
          >
            <Text style={styles.progressText}>{collectionRate}%</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.muted} />
      </Pressable>

      <View style={styles.appointmentsHeader}>
        <Text style={styles.sectionTitle}>Próximos atendimentos</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/appointments")}
          style={styles.seeAll}
        >
          <Text style={styles.seeAllText}>Ver todos</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.accent} />
        </Pressable>
      </View>

      <View style={styles.appointmentList}>
        {upcoming.map((appointment, index) => (
          <Pressable
            accessibilityRole="button"
            key={appointment.id}
            onPress={() => router.push("/appointments")}
            style={({ pressed }) => [
              styles.appointmentRow,
              index === upcoming.length - 1 && styles.lastAppointmentRow,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.appointmentTime}>{timeOf(appointment.start)}</Text>
            <View
              style={[
                styles.appointmentAccent,
                { backgroundColor: ["#7bbf9e", "#e9a52e", colors.accent][index % 3] },
              ]}
            />
            <View style={styles.appointmentCopy}>
              <Text style={styles.clientName} numberOfLines={1}>
                {appointment.client}
              </Text>
              <Text style={styles.serviceName} numberOfLines={1}>
                {appointment.service_name}
              </Text>
            </View>
            <Text style={styles.professionalName} numberOfLines={1}>
              {appointment.professional?.split(" ")[0]}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        ))}
        {!upcoming.length && !data && !error ? null : !upcoming.length ? (
          <View style={styles.emptySchedule}>
            <Muted>A agenda está livre por enquanto.</Muted>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = {
  dashboardHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    gap: 12,
    marginBottom: 4,
  },
  headerCopy: { flex: 1 as const, minWidth: 0 as const },
  brand: {
    color: colors.muted,
    fontSize: 11,
    letterSpacing: 3,
    marginBottom: 8,
  },
  greeting: {
    color: colors.text,
    fontFamily: "serif",
    lineHeight: 48,
    letterSpacing: -1.2,
  },
  date: { color: colors.muted, fontSize: 15, marginTop: 2 },
  monogram: {
    color: colors.accent,
    fontFamily: "serif",
    fontSize: 58,
    lineHeight: 66,
    marginRight: 4,
  },
  metricsGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    justifyContent: "space-between" as const,
    rowGap: 10,
  },
  metricCard: {
    width: "48.5%" as const,
    minHeight: 112,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    padding: 13,
    borderRadius: 20,
    backgroundColor: "#1a181b",
  },
  metricCardCompact: { width: "100%" as const, minHeight: 92 },
  metricIcon: {
    width: 44,
    height: 44,
    borderRadius: 24,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  metricContent: { flex: 1 as const, minWidth: 0 as const, gap: 3 },
  metricLabel: { color: colors.muted, fontSize: 13 },
  metricValue: { fontSize: 21, lineHeight: 27, fontWeight: "600" as const },
  metricDetail: { color: colors.muted, fontSize: 12 },
  cashCard: {
    minHeight: 126,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    paddingHorizontal: 17,
    paddingVertical: 15,
    borderRadius: 22,
    backgroundColor: "#1a181b",
  },
  cashIcon: {
    width: 52,
    height: 52,
    borderRadius: 28,
    backgroundColor: "#bd79a224",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  cashCopy: { flex: 1 as const, minWidth: 0 as const, gap: 5 },
  cashTitle: { color: colors.text, fontSize: 16, fontWeight: "600" as const },
  cashLabel: { color: colors.muted, fontSize: 13 },
  cashValue: { color: colors.text, fontSize: 16, fontWeight: "500" as const },
  progressWrap: { alignItems: "center" as const, justifyContent: "center" as const },
  progressRing: {
    width: 91,
    height: 91,
    borderWidth: 8,
    borderColor: colors.border,
    borderRadius: 48,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    transform: [{ rotate: "-35deg" }],
  },
  progressText: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "700" as const,
    transform: [{ rotate: "35deg" }],
  },
  appointmentsHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    gap: 8,
    marginTop: 9,
    marginBottom: -2,
  },
  sectionTitle: {
    flexShrink: 1 as const,
    color: colors.text,
    fontFamily: "serif",
    fontSize: 24,
    fontWeight: "600" as const,
  },
  seeAll: { flexDirection: "row" as const, alignItems: "center" as const, gap: 2 },
  seeAllText: { color: colors.accent, fontSize: 14, fontWeight: "500" as const },
  appointmentList: {
    overflow: "hidden" as const,
    borderRadius: 20,
    backgroundColor: "#1a181b",
  },
  appointmentRow: {
    minHeight: 73,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#302b31",
  },
  lastAppointmentRow: { borderBottomWidth: 0 },
  appointmentTime: { width: 58, color: colors.text, fontSize: 15, fontWeight: "600" as const },
  appointmentAccent: { width: 4, height: 43, borderRadius: 4 },
  appointmentCopy: { flex: 1 as const, minWidth: 0 as const, gap: 4 },
  clientName: { color: colors.text, fontSize: 15, fontWeight: "500" as const },
  serviceName: { color: colors.muted, fontSize: 13 },
  professionalName: { maxWidth: 58, color: colors.muted, fontSize: 13, textAlign: "right" as const },
  emptySchedule: { minHeight: 72, justifyContent: "center" as const, paddingHorizontal: 18 },
  pressed: { opacity: 0.72 },
};
