import React, { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth, brl, cents, today } from "../core";
import {
  Screen,
  EditorialHeader,
  Field,
  Chips,
  Button,
  Notice,
  Muted,
  colors,
} from "../components/ui";

const methodLabels: Record<string, string> = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  debito: "Cartão de débito",
  credito: "Cartão de crédito",
  other: "Outro",
};

function timeLabel(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function methodLabel(value: string): string {
  return methodLabels[value] ?? value;
}

function StatusPill({ status }: { status: string }) {
  const open = status === "aberto";
  const label = open
    ? "Em andamento"
    : status === "aguardando_conferencia"
      ? "Conferência pendente"
      : status === "conferido"
        ? "Conferido"
        : "Não aberto";
  const color = open ? "#6fce8d" : status === "aguardando_conferencia" ? "#e7a33c" : colors.muted;
  return (
    <View style={[styles.statusPill, { backgroundColor: `${color}20`, borderColor: `${color}58` }]}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={[styles.statusLabel, { color }]}>{label}</Text>
    </View>
  );
}

export default function Cash() {
  const { request, session } = useAuth();
  const [summary, setSummary] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [initial, setInitial] = useState("0");
  const [counted, setCounted] = useState("");
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [withdrawalDescription, setWithdrawalDescription] = useState("Sangria");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("pix");
  const [showAll, setShowAll] = useState(false);
  const [showWithdrawal, setShowWithdrawal] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const todaySummary = summary?.date === today() ? summary : null;
  const isOpen = todaySummary?.status === "aberto";
  const needsReconciliation = todaySummary?.status === "aguardando_conferencia";
  const receivedByMethod = todaySummary?.receivedByMethod ?? {};
  const recent = todaySummary?.recent ?? [];
  const cashOutflow = Number(todaySummary?.cashExpenses ?? 0);
  const withdrawalTotal = Number(todaySummary?.withdrawals ?? 0);
  const regularCashExpenses = Math.max(0, cashOutflow - withdrawalTotal);

  const load = useCallback(async () => {
    if (session?.user.role !== "admin" && session?.user.role !== "operator") return;
    const [cashSummary, expenseRows] = await Promise.all([
      request(`/cash/summary?date=${today()}`),
      request("/expenses"),
    ]);
    setSummary(cashSummary);
    setExpenses(expenseRows);
  }, [request, session?.user.role]);

  useFocusEffect(
    useCallback(() => {
      void load().catch((e) => setError(e.message));
    }, [load]),
  );

  async function action(path: string, body: unknown) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await request(path, "POST", body);
      setMessage("Operação registrada.");
      setDescription("");
      setAmount("");
      setCounted("");
      setWithdrawalAmount("");
      setWithdrawalDescription("Sangria");
      setShowWithdrawal(false);
      setShowExpenseForm(false);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function safe(fn: () => void) {
    try {
      fn();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const displayedRows = showAll ? recent : recent.slice(0, 3);
  const valueTitle = needsReconciliation ? "Dinheiro contado" : "Dinheiro esperado";
  const mainAmount = needsReconciliation
    ? todaySummary?.counted ?? todaySummary?.expected ?? todaySummary?.initial ?? 0
    : todaySummary?.expected ?? todaySummary?.initial ?? 0;

  return (
    <Screen admin dashboard title="Caixa" busy={busy && !summary}>
      <EditorialHeader title="Caixa" subtitle="Acompanhe o movimento do seu salão" />
      <Notice error message={error} />
      <Notice message={message} />

      <View style={styles.statusHeader}>
        <View style={styles.cashHeadline}>
          <Text style={styles.cashTitle}>{isOpen ? "Caixa aberto" : needsReconciliation ? "Caixa em conferência" : "Caixa do dia"}</Text>
          <Text style={styles.cashSubtitle}>{valueTitle}</Text>
          <Text style={styles.cashValue}>{brl(Number(mainAmount))}</Text>
          {todaySummary?.openedAt && (
            <Text style={styles.openedText}>
              Aberto às {timeLabel(todaySummary.openedAt)}{todaySummary.openedBy ? ` por ${todaySummary.openedBy.split(" ")[0]}` : ""}
            </Text>
          )}
        </View>
        <StatusPill status={todaySummary?.status ?? "nao_aberto"} />
      </View>

      {!todaySummary || todaySummary.status === "nao_aberto" ? (
        <View style={styles.panel}>
          <View style={styles.panelHeading}>
            <Ionicons name="cash-outline" size={24} color={colors.accent} />
            <Text style={styles.panelTitle}>Abrir caixa</Text>
          </View>
          <Text style={styles.sectionSubtitle}>Informe o saldo inicial em dinheiro</Text>
          <Field label="Saldo inicial (R$)" value={initial} onChangeText={setInitial} numeric />
          <Button title="Abrir caixa" disabled={busy} onPress={() => safe(() => action("/cash/open", { initial: cents(initial) }))} />
        </View>
      ) : (
        <>
          <View style={styles.panel}>
            <View style={styles.panelHeading}>
              <Ionicons name="server-outline" size={24} color={colors.accent} />
              <Text style={styles.panelTitle}>Dinheiro</Text>
            </View>
            <View style={styles.amountRow}>
              <Text style={styles.rowLabel}>Saldo inicial</Text>
              <Text style={styles.rowValue}>{brl(Number(todaySummary.initial ?? 0))}</Text>
            </View>
            <View style={styles.amountRow}>
              <Text style={styles.rowLabel}>Entradas</Text>
              <Text style={styles.rowValue}>{brl(Number(todaySummary.income ?? 0))}</Text>
            </View>
            <View style={styles.amountRow}>
              <Text style={styles.rowLabel}>Despesas</Text>
              <Text style={styles.rowValue}>−{brl(regularCashExpenses)}</Text>
            </View>
            <View style={[styles.amountRow, styles.amountRowLast]}>
              <Text style={styles.rowLabel}>Sangria</Text>
              <Text style={styles.rowValue}>−{brl(withdrawalTotal)}</Text>
            </View>
          </View>

          <View style={styles.panel}>
            <View style={styles.panelHeading}>
              <Ionicons name="card-outline" size={24} color={colors.accent} />
              <Text style={styles.panelTitle}>Recebido sem afetar a gaveta</Text>
            </View>
            {[
              ["pix", "Pix"],
              ["debito", "Cartão de débito"],
              ["credito", "Cartão de crédito"],
            ].map(([key, label]) => (
              <View key={key} style={styles.amountRow}>
                <Text style={styles.rowLabel}>{label}</Text>
                <Text style={styles.rowValue}>{brl(Number(receivedByMethod[key] ?? 0))}</Text>
              </View>
            ))}
            <View style={[styles.amountRow, styles.amountRowLast]}>
              <Text style={styles.rowLabel}>Outros meios</Text>
              <Text style={styles.rowValue}>{brl(Number(receivedByMethod.other ?? 0))}</Text>
            </View>
          </View>

          <View style={styles.panel}>
            <View style={styles.recentHeading}>
              <View style={styles.panelHeading}>
                <Ionicons name="time-outline" size={24} color={colors.accent} />
                <Text style={styles.panelTitle}>Últimas movimentações</Text>
              </View>
              {recent.length > 3 && (
                <Pressable accessibilityRole="button" onPress={() => setShowAll((value) => !value)} style={styles.viewAll}>
                  <Text style={styles.viewAllText}>{showAll ? "Ver menos" : "Ver todas"}</Text>
                  <Ionicons name={showAll ? "chevron-up" : "chevron-forward"} size={17} color={colors.accent} />
                </Pressable>
              )}
            </View>
            {displayedRows.map((entry: any, index: number) => {
              const isExpense = entry.type === "expense";
              return (
                <Pressable
                  key={entry.id}
                  accessibilityRole="button"
                  onPress={() => router.push("/cash")}
                  style={[styles.movementRow, index === displayedRows.length - 1 && styles.movementLast]}
                >
                  <Text style={styles.movementTime}>{timeLabel(entry.createdAt)}</Text>
                  <View style={styles.movementAccent} />
                  <View style={styles.movementCopy}>
                    <Text style={styles.movementTitle} numberOfLines={1}>{entry.description}</Text>
                    <Text style={styles.movementMethod} numberOfLines={1}>
                      {isExpense ? (entry.description.toLowerCase().startsWith("sangria") ? "Sangria" : "Despesa") : methodLabel(entry.method)}
                    </Text>
                  </View>
                  <Text style={[styles.movementAmount, isExpense && styles.expenseAmount]} numberOfLines={1}>
                    {isExpense ? "−" : ""}{brl(Number(entry.amount))}
                  </Text>
                  <Ionicons name="chevron-forward" size={17} color={colors.muted} />
                </Pressable>
              );
            })}
            {!displayedRows.length && <Muted>As movimentações do dia aparecerão aqui.</Muted>}
          </View>

          {isOpen && (
            <>
              <Button title="Conferir e fechar caixa" disabled={busy} onPress={() => action(`/cash/${today()}/close`, {})} />
              <Pressable accessibilityRole="button" onPress={() => setShowWithdrawal((value) => !value)} style={styles.outlineAction}>
                <Text style={styles.outlineActionText}>{showWithdrawal ? "Cancelar sangria" : "Registrar sangria"}</Text>
              </Pressable>
              {showWithdrawal && (
                <View style={styles.panel}>
                  <Text style={styles.panelTitle}>Retirar dinheiro do caixa</Text>
                  <Text style={styles.sectionSubtitle}>O valor será subtraído do dinheiro esperado, sem ser registrado como despesa.</Text>
                  <Field label="Descrição" value={withdrawalDescription} onChangeText={setWithdrawalDescription} />
                  <Field label="Valor da sangria (R$)" value={withdrawalAmount} onChangeText={setWithdrawalAmount} numeric />
                  <Button
                    title="Confirmar sangria"
                    disabled={busy || !withdrawalAmount}
                    onPress={() => safe(() => action(`/cash/${today()}/withdrawal`, { amount: cents(withdrawalAmount), description: withdrawalDescription }))}
                  />
                </View>
              )}
            </>
          )}

          {needsReconciliation && (
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Conferir dinheiro contado</Text>
              <Field label="Dinheiro contado (R$)" value={counted} onChangeText={setCounted} numeric />
              <Button
                title="Confirmar contagem"
                disabled={busy || !counted}
                onPress={() => safe(() => action(`/cash/${today()}/reconcile`, { counted: cents(counted) }))}
              />
            </View>
          )}
        </>
      )}

      <Pressable accessibilityRole="button" onPress={() => setShowExpenseForm((value) => !value)} style={styles.expenseToggle}>
        <Ionicons name="add-circle-outline" size={19} color={colors.accent} />
        <Text style={styles.outlineActionText}>{showExpenseForm ? "Fechar despesas" : "Registrar despesa"}</Text>
      </Pressable>
      {showExpenseForm && (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Registrar despesa paga hoje</Text>
          <Field label="Descrição" value={description} onChangeText={setDescription} />
          <Field label="Valor (R$)" value={amount} onChangeText={setAmount} numeric />
          <Chips
            items={["pix", "dinheiro", "debito", "credito"].map((value) => ({ id: value, label: methodLabel(value) }))}
            value={method}
            onSelect={setMethod}
          />
          <Button
            title="Salvar despesa"
            disabled={busy || !description || !amount}
            onPress={() => safe(() => action("/expenses", { description, amount: cents(amount), method, date: today() }))}
          />
        </View>
      )}

      {!!expenses.length && (
        <Pressable accessibilityRole="button" onPress={() => router.push("/reports")} style={styles.expenseLink}>
          <Text style={styles.expenseLinkText}>Ver relatório de despesas ({expenses.length})</Text>
          <Ionicons name="chevron-forward" size={17} color={colors.muted} />
        </Pressable>
      )}
    </Screen>
  );
}

const styles = {
  statusHeader: { flexDirection: "row" as const, alignItems: "flex-start" as const, justifyContent: "space-between" as const, gap: 8 },
  cashHeadline: { flex: 1 as const, minWidth: 0 as const },
  cashTitle: { color: colors.text, fontFamily: "serif", fontSize: 32, lineHeight: 39 },
  cashSubtitle: { color: colors.muted, fontSize: 15, marginTop: 1 },
  cashValue: { color: colors.text, fontSize: 34, fontWeight: "600" as const, lineHeight: 41 },
  openedText: { color: colors.muted, fontSize: 14, marginTop: 6 },
  statusPill: { flexDirection: "row" as const, alignItems: "center" as const, gap: 7, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 20, borderWidth: 1, marginTop: 5 },
  statusDot: { width: 8, height: 8, borderRadius: 5 },
  statusLabel: { fontSize: 13, fontWeight: "500" as const },
  panel: { paddingHorizontal: 17, paddingVertical: 14, borderRadius: 18, backgroundColor: "#1a181b", borderWidth: 1, borderColor: "#272329" },
  panelHeading: { flexDirection: "row" as const, alignItems: "center" as const, gap: 13 },
  panelTitle: { color: colors.text, fontSize: 16, fontWeight: "600" as const, flexShrink: 1 as const },
  sectionSubtitle: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 8, marginBottom: 10 },
  amountRow: { minHeight: 36, flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "space-between" as const, gap: 8, marginLeft: 35, borderTopWidth: 1, borderTopColor: "#302b31" },
  amountRowLast: { borderBottomWidth: 0 },
  rowLabel: { color: colors.muted, fontSize: 14 },
  rowValue: { color: colors.text, fontSize: 14, fontWeight: "500" as const },
  recentHeading: { flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "space-between" as const, gap: 6, paddingBottom: 8 },
  viewAll: { flexDirection: "row" as const, alignItems: "center" as const, gap: 2 },
  viewAllText: { color: colors.accent, fontSize: 13 },
  movementRow: { minHeight: 59, flexDirection: "row" as const, alignItems: "center" as const, gap: 9, borderTopWidth: 1, borderTopColor: "#302b31" },
  movementLast: { borderBottomWidth: 0 },
  movementTime: { width: 50, color: colors.text, fontSize: 14 },
  movementAccent: { width: 3, height: 37, borderRadius: 2, backgroundColor: colors.accent },
  movementCopy: { flex: 1 as const, minWidth: 0 as const, gap: 3, paddingLeft: 4 },
  movementTitle: { color: colors.text, fontSize: 14, fontWeight: "500" as const },
  movementMethod: { color: colors.muted, fontSize: 12 },
  movementAmount: { maxWidth: 105, color: colors.text, fontSize: 14 },
  expenseAmount: { color: colors.muted },
  outlineAction: { minHeight: 47, borderRadius: 14, borderWidth: 1, borderColor: "#3c303b", alignItems: "center" as const, justifyContent: "center" as const },
  outlineActionText: { color: colors.accent, fontSize: 15, fontWeight: "500" as const },
  expenseToggle: { minHeight: 44, flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "center" as const, gap: 8 },
  expenseLink: { minHeight: 42, flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "space-between" as const, paddingHorizontal: 4 },
  expenseLinkText: { color: colors.muted, fontSize: 13 },
};
