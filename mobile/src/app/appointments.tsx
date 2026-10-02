import React, { useState, useCallback } from "react";
import { Text, View, Alert, Platform, Pressable, ScrollView, Modal, useWindowDimensions } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth, brl, today, cents } from "../core";
import {
  Screen,
  EditorialHeader,
  Muted,
  Button,
  Field,
  Chips,
  Notice,
  colors,
} from "../components/ui";
const labels: Record<string, string> = {
  confirmado: "Confirmado",
  em_atendimento: "Em atendimento",
  concluido: "Concluído",
  cancelado: "Cancelado",
  nao_compareceu: "Não compareceu",
};
type ViewMode = "day" | "week" | "month";

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function shiftDate(value: string, days: number): string {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return isoDate(date);
}

function weekDates(value: string): string[] {
  const weekday = new Date(`${value}T12:00:00Z`).getUTCDay();
  const mondayOffset = (weekday + 6) % 7;
  const monday = shiftDate(value, -mondayOffset);
  return Array.from({ length: 7 }, (_, index) => shiftDate(monday, index));
}

function monthDates(value: string): string[] {
  const [year, month] = value.split("-").map(Number);
  const total = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Array.from({ length: total }, (_, index) => `${value.slice(0, 7)}-${String(index + 1).padStart(2, "0")}`);
}

function shiftMonth(value: string, amount: number): string {
  const date = new Date(`${value.slice(0, 7)}-01T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + amount);
  return isoDate(date);
}

function monthTitle(value: string): string {
  const label = new Date(`${value.slice(0, 7)}-01T12:00:00Z`).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function dayTitle(value: string): string {
  const label = new Date(`${value}T12:00:00Z`).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function weekdayShort(value: string): string {
  return new Date(`${value}T12:00:00Z`)
    .toLocaleDateString("pt-BR", { timeZone: "UTC", weekday: "short" })
    .replace(".", "");
}

function timeLabel(value: string): string {
  return new Date(value).toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function appointmentDay(value: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function statusColor(status: string): string {
  if (status === "em_atendimento") return "#7bbf9e";
  if (status === "aguardando_confirmacao") return "#e9a52e";
  if (status === "cancelado" || status === "nao_compareceu") return "#79747e";
  return colors.accent;
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export default function Appointments() {
  const { request, session } = useAuth();
  const { width } = useWindowDimensions();
  const compact = width < 370;
  const admin = session?.user.role === "admin" || session?.user.role === "operator";
  const [rows, setRows] = useState<any[]>([]),
    [date, setDate] = useState(today()),
    [viewMode, setViewMode] = useState<ViewMode>("day"),
    [professionals, setProfessionals] = useState<any[]>([]),
    [services, setServices] = useState<any[]>([]),
    [createVisible, setCreateVisible] = useState(false),
    [bookingService, setBookingService] = useState(0),
    [bookingProfessional, setBookingProfessional] = useState(0),
    [bookingDate, setBookingDate] = useState(today()),
    [bookingSlots, setBookingSlots] = useState<any[]>([]),
    [bookingSlot, setBookingSlot] = useState(""),
    [bookingBusy, setBookingBusy] = useState(false),
    [professionalId, setProfessionalId] = useState<number | "all">("all"),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [selected, setSelected] = useState(0),
    [paying, setPaying] = useState(0),
    [rescheduling, setRescheduling] = useState(0),
    [amount, setAmount] = useState(""),
    [method, setMethod] = useState("pix"),
    [newDate, setNewDate] = useState(""),
    [newSlot, setNewSlot] = useState(""),
    [slots, setSlots] = useState<any[]>([]);
  const load = useCallback(async () => {
    if (!session) return;
    setBusy(true);
    setError("");
    try {
      const query = viewMode === "day" ? `?date=${date}` : "?limit=500";
      const [appointments, people, catalog] = await Promise.all([
        request("/appointments" + query),
        request("/professionals"),
        request("/services"),
      ]);
      setRows(appointments);
      setProfessionals(people.filter((person: any) => person.active !== 0));
      setServices(catalog.filter((service: any) => service.active !== 0));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [date, viewMode, session, request]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  async function act(path: string, body: unknown = {}) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await request(path, "PATCH", body);
      setMessage("Agendamento atualizado.");
      setSelected(0);
      setPaying(0);
      setRescheduling(0);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function cancel(id: number) {
    if (Platform.OS === "web") {
      if (window.confirm("Cancelar este agendamento?"))
        act(`/appointments/${id}/cancel`);
    } else
      Alert.alert(
        "Cancelar agendamento",
        "O horário será liberado para outras pessoas.",
        [
          { text: "Voltar", style: "cancel" },
          {
            text: "Cancelar horário",
            style: "destructive",
            onPress: () => act(`/appointments/${id}/cancel`),
          },
        ],
      );
  }
  async function pay(a: any) {
    setBusy(true);
    setError("");
    try {
      await request("/payments", "POST", {
        appointment_id: a.id,
        amount: cents(amount),
        method,
        request_key: `payment-${a.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      });
      setAmount("");
      setSelected(0);
      setPaying(0);
      setMessage("Pagamento registrado.");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function available(a: any) {
    setBusy(true);
    try {
      setSlots(
        await request(
          `/availability?service_id=${a.service_id}&professional_id=${a.professional_id}&date=${newDate}`,
        ),
      );
      setNewSlot("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function checkBookingAvailability() {
    if (!bookingService || !bookingProfessional) {
      setError("Selecione um serviço e um profissional.");
      return;
    }
    if (!validDate(bookingDate)) {
      setError("Informe uma data válida no formato AAAA-MM-DD.");
      return;
    }
    setBookingBusy(true);
    setBookingSlots([]);
    setBookingSlot("");
    setError("");
    try {
      const availableSlots = await request(
        `/availability?service_id=${bookingService}&professional_id=${bookingProfessional}&date=${bookingDate}`,
      );
      setBookingSlots(availableSlots);
      if (!availableSlots.length) setError("Não há horários disponíveis para essa combinação.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBookingBusy(false);
    }
  }

  async function createBooking() {
    if (!bookingSlot || !bookingSlots.some((slot) => slot.start === bookingSlot)) {
      setError("Consulte e selecione um horário disponível antes de confirmar.");
      return;
    }
    setBookingBusy(true);
    setError("");
    try {
      await request("/appointments", "POST", {
        service_id: bookingService,
        professional_id: bookingProfessional,
        start: bookingSlot,
      });
      setCreateVisible(false);
      setMessage("Agendamento criado com sucesso.");
      setDate(bookingDate);
      setViewMode("day");
      if (admin) setProfessionalId(bookingProfessional);
      setRows(await request(`/appointments?date=${bookingDate}`));
      setBookingService(0);
      setBookingProfessional(0);
      setBookingDate(today());
      setBookingSlots([]);
      setBookingSlot("");
      await load();
    } catch (e) {
      setError((e as Error).message);
      setBookingSlots([]);
      setBookingSlot("");
    } finally {
      setBookingBusy(false);
    }
  }

  function openBookingForm() {
    setError("");
    setBookingService(0);
    setBookingProfessional(0);
    setBookingDate(date || today());
    setBookingSlots([]);
    setBookingSlot("");
    setCreateVisible(true);
  }
  const dateItems = viewMode === "month" ? monthDates(date) : weekDates(date);
  const scope = viewMode === "day" ? [date, date] : viewMode === "week"
    ? [weekDates(date)[0], weekDates(date)[6]]
    : [`${date.slice(0, 7)}-01`, `${date.slice(0, 7)}-${String(monthDates(date).length).padStart(2, "0")}`];
  const visibleRows = rows
    .filter((appointment) => {
      const day = appointmentDay(appointment.start);
      return day >= scope[0] && day <= scope[1] &&
        (professionalId === "all" || appointment.professional_id === professionalId);
    })
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  return (
      <Screen title="Agenda" dashboard busy={busy}>
        <EditorialHeader title="Agenda" subtitle="Seus atendimentos, dia a dia" />
        <Notice error message={error} />
        <Notice message={message} />

        <View style={agendaStyles.modeBar}>
          {([
            ["day", "Dia"],
            ["week", "Semana"],
            ["month", "Mês"],
          ] as [ViewMode, string][]).map(([mode, label]) => (
            <Pressable
              accessibilityRole="button"
              key={mode}
              onPress={() => setViewMode(mode)}
              style={[agendaStyles.modeButton, viewMode === mode && agendaStyles.modeSelected]}
            >
              <Text style={[agendaStyles.modeLabel, viewMode === mode && agendaStyles.modeLabelSelected]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        {viewMode === "month" && (
          <View style={agendaStyles.monthNavigation}>
            <Pressable accessibilityRole="button" onPress={() => setDate(shiftMonth(date, -1))} style={agendaStyles.monthArrow}>
              <Ionicons name="chevron-back" size={20} color={colors.text} />
            </Pressable>
            <Text style={agendaStyles.monthTitle}>{monthTitle(date)}</Text>
            <Pressable accessibilityRole="button" onPress={() => setDate(shiftMonth(date, 1))} style={agendaStyles.monthArrow}>
              <Ionicons name="chevron-forward" size={20} color={colors.text} />
            </Pressable>
          </View>
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={agendaStyles.dateStrip}>
          {dateItems.map((item) => {
            const selectedDate = item === date;
            return (
              <Pressable
                accessibilityRole="button"
                key={item}
                onPress={() => setDate(item)}
                style={[agendaStyles.dateItem, selectedDate && agendaStyles.dateSelected]}
              >
                <Text style={[agendaStyles.weekday, selectedDate && agendaStyles.dateTextSelected]}>
                  {weekdayShort(item)}
                </Text>
                <Text style={[agendaStyles.dayNumber, selectedDate && agendaStyles.dateTextSelected]}>
                  {Number(item.slice(-2))}
                </Text>
                <View style={agendaStyles.dateDots}>
                  {visibleRows.some((appointment) => appointmentDay(appointment.start) === item) && (
                    <View style={[agendaStyles.dateDot, selectedDate && agendaStyles.dateDotSelected]} />
                  )}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        {admin && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={agendaStyles.professionalFilters}>
            {[
              { id: "all" as const, name: "Todas" },
              ...professionals.map((person) => ({ id: person.id as number, name: person.name as string })),
            ].map((person) => {
              const active = professionalId === person.id;
              return (
                <Pressable
                  accessibilityRole="button"
                  key={person.id}
                  onPress={() => setProfessionalId(person.id)}
                  style={[agendaStyles.professionalChip, active && agendaStyles.professionalChipActive]}
                >
                  <Text style={[agendaStyles.professionalChipText, active && agendaStyles.professionalChipTextActive]}>
                    {person.name.split(" ")[0]}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        <View style={agendaStyles.dayHeading}>
          <Text style={agendaStyles.dayTitle}>
            {viewMode === "month" ? monthTitle(date) : viewMode === "week" ? `Semana de ${dayTitle(scope[0])}` : dayTitle(date)}
          </Text>
          <Text style={agendaStyles.countText}>{visibleRows.length} atendimentos</Text>
        </View>

        <View style={agendaStyles.appointmentList}>
          {visibleRows.map((appointment, index) => {
            const expanded = selected === appointment.id;
            const color = statusColor(appointment.status);
            return (
              <React.Fragment key={appointment.id}>
              {viewMode !== "day" && (index === 0 || appointmentDay(visibleRows[index - 1].start) !== appointmentDay(appointment.start)) && (
                <Text style={agendaStyles.groupHeading}>{dayTitle(appointmentDay(appointment.start))}</Text>
              )}
              <View style={agendaStyles.appointmentItem}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setSelected(expanded ? 0 : appointment.id)}
                  style={agendaStyles.appointmentSummary}
                >
                  <Text style={agendaStyles.appointmentTime}>{timeLabel(appointment.start)}</Text>
                  <View style={[agendaStyles.statusAccent, { backgroundColor: color }]} />
                  <View style={agendaStyles.appointmentNames}>
                    <Text style={agendaStyles.clientName} numberOfLines={1}>{admin ? appointment.client : appointment.professional}</Text>
                    <Text style={agendaStyles.serviceName} numberOfLines={1}>{appointment.service_name}</Text>
                  </View>
                  <View style={[agendaStyles.statusPill, compact && agendaStyles.statusPillCompact, { backgroundColor: `${color}26` }]}>
                    <Text style={[agendaStyles.statusText, { color }]} numberOfLines={1}>
                      {labels[appointment.status] || appointment.status}
                    </Text>
                  </View>
                  <Ionicons name={expanded ? "chevron-up" : "chevron-forward"} size={19} color={colors.muted} />
                </Pressable>

                {expanded && (
                  <View style={agendaStyles.appointmentDetails}>
                    <Text style={agendaStyles.detailText}>{appointment.professional} · {brl(appointment.price)}</Text>
                    {appointment.notes ? <Muted>{appointment.notes}</Muted> : null}
                    {admin && (
                      <Button
                        secondary
                        title="Abrir comanda / estornos"
                        onPress={() => router.push({ pathname: "/order", params: { id: String(appointment.id) } })}
                      />
                    )}
                    { ["confirmado", "aguardando_confirmacao"].includes(appointment.status) && (
                      <>
                        <Button
                          secondary
                          title="Reagendar"
                          onPress={() => { setSelected(appointment.id); setRescheduling(appointment.id); setPaying(0); setNewDate(today()); setSlots([]); }}
                        />
                        <Button secondary title="Cancelar horário" onPress={() => cancel(appointment.id)} />
                      </>
                    )}
                    {admin && appointment.status === "confirmado" && (
                      <>
                        <Button title="Iniciar atendimento" onPress={() => act(`/appointments/${appointment.id}/status`, { status: "em_atendimento" })} />
                        <Button secondary title="Marcar ausência" onPress={() => act(`/appointments/${appointment.id}/status`, { status: "nao_compareceu" })} />
                      </>
                    )}
                    {admin && appointment.status === "em_atendimento" && (
                      <Button title="Concluir atendimento" onPress={() => act(`/appointments/${appointment.id}/status`, { status: "concluido" })} />
                    )}
                    {admin && !["cancelado", "nao_compareceu"].includes(appointment.status) && appointment.paid < appointment.price && (
                      <Button
                        secondary
                        title="Registrar pagamento / sinal"
                        onPress={() => { setSelected(appointment.id); setPaying(appointment.id); setRescheduling(0); setAmount(((appointment.price - appointment.paid) / 100).toFixed(2)); setSlots([]); }}
                      />
                    )}
                    {admin && paying === appointment.id && (
                      <>
                        <Field label="Valor recebido (R$)" value={amount} onChangeText={setAmount} numeric />
                        <Chips items={["pix", "dinheiro", "debito", "credito"].map((item) => ({ id: item, label: item }))} value={method} onSelect={setMethod} />
                        <Button title="Confirmar recebimento" disabled={busy || !amount} onPress={() => pay(appointment)} />
                      </>
                    )}
                    {rescheduling === appointment.id && ["confirmado", "aguardando_confirmacao"].includes(appointment.status) && (
                      <>
                        <Field label="Nova data (AAAA-MM-DD)" value={newDate} onChangeText={setNewDate} />
                        <Button secondary title="Buscar novos horários" onPress={() => available(appointment)} />
                        <Chips items={slots.map((slot) => ({ id: slot.start, label: slot.label }))} value={newSlot} onSelect={setNewSlot} />
                        <Button title="Confirmar novo horário" disabled={!newSlot || busy} onPress={() => act(`/appointments/${appointment.id}/reschedule`, { start: newSlot })} />
                      </>
                    )}
                  </View>
                )}
              </View>
              </React.Fragment>
            );
          })}
          {!visibleRows.length && !busy && (
            <View style={agendaStyles.emptyAgenda}>
              <Muted>Nenhum atendimento para este dia e profissional.</Muted>
            </View>
          )}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Criar agendamento"
          onPress={openBookingForm}
          style={agendaStyles.createButton}
        >
          <Ionicons name="add" size={34} color="#fff" />
        </Pressable>

        <Modal transparent animationType="slide" visible={createVisible} onRequestClose={() => setCreateVisible(false)}>
          <Pressable style={agendaStyles.modalBackdrop} onPress={() => setCreateVisible(false)}>
            <Pressable style={agendaStyles.modalSheet} onPress={(event) => event.stopPropagation()}>
              <View style={agendaStyles.modalHandle} />
              <Text style={agendaStyles.modalTitle}>Novo agendamento</Text>
              <ScrollView keyboardShouldPersistTaps="handled">
                <Text style={agendaStyles.formLabel}>Serviço</Text>
                <View style={agendaStyles.bookingOptions}>
                  {services.map((service) => (
                    <Pressable
                      key={service.id}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: bookingService === service.id }}
                      onPress={() => {
                        setBookingService(service.id);
                        setBookingProfessional(0);
                        setBookingSlots([]);
                        setBookingSlot("");
                      }}
                      style={[agendaStyles.bookingOption, bookingService === service.id && agendaStyles.bookingOptionSelected]}
                    >
                      <Text style={[agendaStyles.bookingOptionText, bookingService === service.id && agendaStyles.bookingOptionTextSelected]}>
                        {service.name} · {brl(service.price)}
                      </Text>
                    </Pressable>
                  ))}
                  {!services.length && <Muted>Nenhum serviço disponível.</Muted>}
                </View>

                <Text style={agendaStyles.formLabel}>Profissional</Text>
                <View style={agendaStyles.bookingOptions}>
                  {professionals
                    .filter((person) => person.active !== 0 && (!bookingService || person.service_ids?.includes(bookingService)))
                    .map((person) => (
                      <Pressable
                        key={person.id}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: bookingProfessional === person.id }}
                        onPress={() => {
                          setBookingProfessional(person.id);
                          setBookingSlots([]);
                          setBookingSlot("");
                        }}
                        style={[agendaStyles.bookingOption, bookingProfessional === person.id && agendaStyles.bookingOptionSelected]}
                      >
                        <Text style={[agendaStyles.bookingOptionText, bookingProfessional === person.id && agendaStyles.bookingOptionTextSelected]}>
                          {person.name}
                        </Text>
                      </Pressable>
                    ))}
                  {!bookingService && <Muted>Selecione primeiro um serviço.</Muted>}
                  {!!bookingService && !professionals.some((person) => person.active !== 0 && person.service_ids?.includes(bookingService)) && (
                    <Muted>Nenhum profissional ativo oferece este serviço.</Muted>
                  )}
                </View>

                <Field
                  label="Data (AAAA-MM-DD)"
                  value={bookingDate}
                  onChangeText={(value) => {
                    setBookingDate(value);
                    setBookingSlots([]);
                    setBookingSlot("");
                  }}
                  placeholder={today()}
                />
                <Button
                  secondary
                  title="Consultar horários disponíveis"
                  disabled={bookingBusy || !bookingService || !bookingProfessional}
                  onPress={() => void checkBookingAvailability()}
                />
                {!!bookingSlots.length && (
                  <>
                    <Text style={agendaStyles.formLabel}>Horários disponíveis</Text>
                    <Chips
                      items={bookingSlots.map((slot) => ({ id: slot.start, label: slot.label }))}
                      value={bookingSlot}
                      onSelect={setBookingSlot}
                    />
                  </>
                )}
                <View style={agendaStyles.bookingSubmit}>
                  <Button
                    title="Confirmar agendamento"
                    disabled={bookingBusy || !bookingSlot}
                    onPress={() => void createBooking()}
                  />
                  <Button secondary title="Cancelar" onPress={() => setCreateVisible(false)} />
                </View>
                <Muted>O horário é validado novamente ao confirmar a reserva.</Muted>
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      </Screen>
    );
}

const agendaStyles = {
  modeBar: {
    flexDirection: "row" as const,
    padding: 5,
    borderRadius: 30,
    backgroundColor: "#1a181b",
  },
  modeButton: {
    flex: 1 as const,
    minHeight: 44,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: 26,
  },
  modeSelected: { backgroundColor: "#67304e" },
  modeLabel: { color: colors.text, fontSize: 15 },
  modeLabelSelected: { color: "#f8eaf2" },
  monthNavigation: { height: 42, flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "space-between" as const },
  monthArrow: { width: 40, height: 40, alignItems: "center" as const, justifyContent: "center" as const },
  monthTitle: { color: colors.text, fontSize: 16, fontWeight: "500" as const },
  dateStrip: { gap: 7, paddingVertical: 2 },
  dateItem: {
    width: 58,
    minHeight: 104,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: 18,
    backgroundColor: "#1a181b",
    gap: 7,
  },
  dateSelected: { backgroundColor: "#6a3150" },
  weekday: { color: colors.muted, fontSize: 13, textTransform: "lowercase" as const },
  dayNumber: { color: colors.text, fontSize: 25, lineHeight: 29, fontWeight: "500" as const },
  dateTextSelected: { color: "#fff7fb" },
  dateDots: { height: 8, flexDirection: "row" as const, alignItems: "center" as const, gap: 3 },
  dateDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#c9b8c5" },
  dateDotSelected: { backgroundColor: "#fff" },
  professionalFilters: { gap: 8, paddingVertical: 2 },
  professionalChip: {
    minHeight: 42,
    paddingHorizontal: 20,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    borderRadius: 28,
    backgroundColor: "#1a181b",
  },
  professionalChipActive: { backgroundColor: colors.accent },
  professionalChipText: { color: colors.text, fontSize: 14 },
  professionalChipTextActive: { color: "#1b1017", fontWeight: "600" as const },
  dayHeading: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    gap: 8,
    marginTop: 2,
    marginBottom: -2,
  },
  dayTitle: { flexShrink: 1 as const, color: colors.text, fontFamily: "serif", fontSize: 20, fontWeight: "600" as const },
  countText: { color: colors.muted, fontSize: 14 },
  appointmentList: { overflow: "hidden" as const, borderRadius: 20, backgroundColor: "#1a181b" },
  appointmentItem: { borderBottomWidth: 1, borderBottomColor: "#302b31" },
  groupHeading: { color: colors.muted, fontSize: 13, fontWeight: "600" as const, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  appointmentSummary: {
    minHeight: 84,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 9,
    paddingHorizontal: 12,
  },
  appointmentTime: { width: 56, color: colors.text, fontSize: 14, fontWeight: "600" as const },
  statusAccent: { width: 4, height: 48, borderRadius: 4 },
  appointmentNames: { flex: 1 as const, minWidth: 0 as const, gap: 5 },
  clientName: { color: colors.text, fontSize: 15, fontWeight: "500" as const },
  serviceName: { color: colors.muted, fontSize: 13 },
  statusPill: { maxWidth: 132, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 24 },
  statusPillCompact: { maxWidth: 94, paddingVertical: 8, paddingHorizontal: 8 },
  statusText: { fontSize: 12, fontWeight: "500" as const },
  appointmentDetails: { gap: 10, paddingHorizontal: 16, paddingBottom: 16 },
  detailText: { color: colors.muted, fontSize: 14 },
  emptyAgenda: { minHeight: 94, justifyContent: "center" as const, paddingHorizontal: 18 },
  createButton: { width: 58, height: 58, alignSelf: "flex-end" as const, alignItems: "center" as const, justifyContent: "center" as const, marginTop: 2, marginBottom: 6, borderRadius: 32, backgroundColor: colors.accent, elevation: 5 },
  modalBackdrop: { flex: 1, justifyContent: "flex-end" as const, backgroundColor: "rgba(0,0,0,0.68)" },
  modalSheet: { width: "100%" as const, maxWidth: 620, maxHeight: "88%" as const, alignSelf: "center" as const, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28, borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: "#1a181b" },
  modalHandle: { width: 42, height: 4, alignSelf: "center" as const, borderRadius: 3, backgroundColor: "#5a5059", marginBottom: 16 },
  modalTitle: { color: colors.text, fontSize: 21, fontWeight: "600" as const, marginBottom: 15 },
  formLabel: { color: colors.muted, fontSize: 13, marginBottom: 7, marginTop: 8 },
  bookingOptions: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 7, marginBottom: 8 },
  bookingOption: { minHeight: 38, justifyContent: "center" as const, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 20, backgroundColor: "#252226", borderWidth: 1, borderColor: "#443a45" },
  bookingOptionSelected: { backgroundColor: "#713a5c", borderColor: colors.accent },
  bookingOptionText: { color: colors.muted, fontSize: 13 },
  bookingOptionTextSelected: { color: "#fff", fontWeight: "600" as const },
  bookingSubmit: { gap: 8, marginTop: 14, marginBottom: 10 },
};
