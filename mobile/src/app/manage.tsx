import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth, brl, cents, today } from "../core";
import {
  Screen,
  Field,
  Button,
  Chips,
  Notice,
  Muted,
  colors,
} from "../components/ui";

type Section = "horarios" | "clientes" | "servicos" | "profissionais";
type FormType = "servico" | "profissional" | "folga" | null;
const sections: { id: Section; label: string }[] = [
  { id: "horarios", label: "Horários" },
  { id: "clientes", label: "Clientes" },
  { id: "servicos", label: "Serviços" },
  { id: "profissionais", label: "Profissionais" },
];
const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const serviceCategories = ["Todos", "Cabelo", "Unhas", "Maquiagem", "Sobrancelhas"];

function categoryFor(service: any): string {
  const text = `${service.name} ${service.description ?? ""}`.toLocaleLowerCase();
  if (/manicure|pedicure|unha|esmalta/.test(text)) return "Unhas";
  if (/maqui|make/.test(text)) return "Maquiagem";
  if (/sobrancelha|cílios|cilios/.test(text)) return "Sobrancelhas";
  return "Cabelo";
}

function serviceIcon(category: string): keyof typeof Ionicons.glyphMap {
  if (category === "Unhas") return "color-palette-outline";
  if (category === "Maquiagem") return "brush-outline";
  if (category === "Sobrancelhas") return "eye-outline";
  return "cut-outline";
}

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
}

function timeOnly(value: string): string {
  const [hours = "09", minutes = "00"] = value.split(":");
  return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
}

export default function Manage() {
  const { request, session } = useAuth();
  const { width } = useWindowDimensions();
  const [section, setSection] = useState<Section>("clientes");
  const [services, setServices] = useState<any[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [serviceCategory, setServiceCategory] = useState("Todos");
  const [clientSearch, setClientSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("ativos");
  const [formType, setFormType] = useState<FormType>(null);
  const [editId, setEditId] = useState(0);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("60");
  const [buffer, setBuffer] = useState("0");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [serviceIds, setServiceIds] = useState<number[]>([]);
  const [active, setActive] = useState(1);
  const [leaveProfessional, setLeaveProfessional] = useState(0);
  const [leaveDate, setLeaveDate] = useState(today());
  const [leaveStart, setLeaveStart] = useState("09:00");
  const [leaveEnd, setLeaveEnd] = useState("19:00");
  const [leaveReason, setLeaveReason] = useState("Folga");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const compact = width < 390;

  const load = useCallback(async () => {
    if (session?.user.role !== "admin") return;
    const [serviceRows, professionalRows, cfg, blockRows, todayRows] = await Promise.all([
      request("/services"),
      request("/professionals"),
      request("/settings"),
      request("/blocks"),
      request(`/appointments?date=${today()}`),
    ]);
    setServices(serviceRows);
    setProfessionals(professionalRows);
    setSettings(cfg);
    setBlocks(blockRows);
    setAppointments(todayRows);
  }, [request, session?.user.role]);

  useFocusEffect(
    useCallback(() => {
      void load().catch((e) => setError(e.message));
    }, [load]),
  );

  useEffect(() => {
    if (session?.user.role !== "admin") return;
    let activeRequest = true;
    const timeout = setTimeout(() => {
      request(`/clients?limit=100&search=${encodeURIComponent(clientSearch)}`)
        .then((rows) => { if (activeRequest) setClients(rows); })
        .catch((e) => { if (activeRequest) setError((e as Error).message); });
    }, 180);
    return () => {
      activeRequest = false;
      clearTimeout(timeout);
    };
  }, [clientSearch, request, session?.user.role]);

  function resetForm() {
    setFormType(null);
    setEditId(0);
    setName("");
    setDescription("");
    setPrice("");
    setDuration("60");
    setBuffer("0");
    setPhone("");
    setEmail("");
    setSpecialties([]);
    setServiceIds([]);
    setActive(1);
    setLeaveProfessional(0);
    setLeaveDate(today());
    setLeaveStart(timeOnly(settings?.opening_time ?? "09:00"));
    setLeaveEnd(timeOnly(settings?.closing_time ?? "19:00"));
    setLeaveReason("Folga");
  }

  async function perform(fn: () => Promise<unknown>, success = "Alterações salvas.") {
    setBusy(true);
    setError("");
    setMessage("");
    try {
          const result = await fn();
          setMessage(typeof result === "string" ? result : success);
      resetForm();
      setSelectedClient(null);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function confirmAction(title: string, text: string, fn: () => void) {
    if (Platform.OS === "web") {
      if (window.confirm(text)) fn();
      return;
    }
    Alert.alert(title, text, [
      { text: "Cancelar", style: "cancel" },
      { text: "Continuar", style: "destructive", onPress: fn },
    ]);
  }

  function startServiceEdit(service: any) {
    setEditId(service.id);
    setName(service.name);
    setDescription(service.description ?? "");
    setPrice((service.price / 100).toFixed(2));
    setDuration(String(service.duration));
    setBuffer(String(service.buffer));
    setActive(service.active ? 1 : 0);
    setFormType("servico");
  }

  function startProfessionalEdit(professional: any) {
    setEditId(professional.id);
    setName(professional.name);
    setPhone(professional.phone ?? "");
    setEmail(professional.email ?? "");
    const existingServiceIds: number[] = professional.service_ids ?? [];
    const storedSpecialties = String(professional.specialty ?? "")
      .split(/[,;]+/)
      .map((value) => value.trim())
      .filter(Boolean);
    const linkedCategories = services
      .filter((service) => existingServiceIds.includes(service.id))
      .map(categoryFor);
    const nextSpecialties = serviceCategories.slice(1).filter((category) =>
      storedSpecialties.includes(category) || linkedCategories.includes(category),
    );
    const categoryServiceIds = services
      .filter((service) => nextSpecialties.includes(categoryFor(service)) && (service.active || existingServiceIds.includes(service.id)))
      .map((service) => service.id);
    setSpecialties(nextSpecialties);
    setServiceIds([...new Set([...existingServiceIds, ...categoryServiceIds])]);
    setActive(professional.active ? 1 : 0);
    setFormType("profissional");
  }

  function toggleSpecialty(category: string) {
    const next = specialties.includes(category)
      ? specialties.filter((value) => value !== category)
      : [...specialties, category];
    setSpecialties(next);
    const groupedIds = services
      .filter((service) => next.includes(categoryFor(service)) && (service.active || serviceIds.includes(service.id)))
      .map((service) => service.id);
    setServiceIds([...new Set([...serviceIds.filter((id) => {
      const service = services.find((item) => item.id === id);
      return service && next.includes(categoryFor(service));
    }), ...groupedIds])]);
  }

  async function saveService() {
    if (!name.trim()) return setError("Informe o nome do serviço.");
    await perform(
      () => request(`/services${editId ? `/${editId}` : ""}`, editId ? "PUT" : "POST", {
        name: name.trim(),
        description,
        price: cents(price),
        duration: Number(duration),
        buffer: Number(buffer),
        active,
      }),
      editId ? "Serviço atualizado." : "Serviço cadastrado.",
    );
  }

  async function saveProfessional() {
    if (!name.trim()) return setError("Informe o nome do profissional.");
    if (!specialties.length) return setError("Selecione ao menos uma especialidade.");
    await perform(
      () => request(`/professionals${editId ? `/${editId}` : ""}`, editId ? "PUT" : "POST", {
        name: name.trim(), phone, email, specialty: specialties.join(", "), service_ids: serviceIds, active,
      }),
      editId ? "Profissional atualizado." : "Profissional cadastrado.",
    );
  }

  async function saveLeave() {
    if (!leaveProfessional) return setError("Selecione o profissional.");
    if (leaveEnd <= leaveStart) return setError("O horário final deve ser posterior ao inicial.");
    await perform(
      () => request("/blocks", "POST", {
        professional_id: leaveProfessional,
        start: `${leaveDate}T${leaveStart}:00-03:00`,
        end: `${leaveDate}T${leaveEnd}:00-03:00`,
        reason: leaveReason.trim() || "Folga",
      }),
      "Folga registrada na agenda.",
    );
  }

  async function deleteService(service: any) {
    await perform(async () => {
      const result = await request(`/services/${service.id}`, "DELETE");
      return result.archived
        ? "O serviço foi desativado para preservar o histórico de agendamentos."
        : "Serviço excluído.";
    });
  }

  async function deleteProfessional(professional: any) {
    await perform(async () => {
      const result = await request(`/professionals/${professional.id}`, "DELETE");
      return result.archived
        ? "O profissional foi arquivado para preservar agendamentos e comissões."
        : "Profissional excluído.";
    });
  }

  async function saveHours() {
    if (!settings) return;
    const openingTime = timeOnly(settings.opening_time);
    const closingTime = timeOnly(settings.closing_time);
    if (closingTime <= openingTime) return setError("O fechamento deve ocorrer depois da abertura.");
    await perform(
      () => request("/settings", "PUT", {
        opening_time: openingTime,
        closing_time: closingTime,
        open_hour: Number(openingTime.slice(0, 2)),
        close_hour: Number(closingTime.slice(0, 2)) || 24,
        close_time: closingTime,
        days: settings.days,
      }),
      "Horário de funcionamento atualizado.",
    );
  }

  if (session?.user.role !== "admin") {
    return (
      <Screen title="Clientes" subtitle="Acesso exclusivo do administrador">
        <Notice error message="Acesso exclusivo do administrador" />
      </Screen>
    );
  }

  const filteredServices = services
    .filter((service) => serviceCategory === "Todos" || categoryFor(service) === serviceCategory)
    .filter((service) => activeFilter === "todos" || (activeFilter === "ativos" ? !!service.active : !service.active));
  const filteredProfessionals = professionals.filter((person) =>
    activeFilter === "todos" || (activeFilter === "ativos" ? !!person.active : !person.active),
  );
  const normalizedSearch = clientSearch.trim().toLocaleLowerCase();
  const filteredClients = clients.filter((client) =>
    `${client.name} ${client.phone ?? ""} ${client.email ?? ""}`.toLocaleLowerCase().includes(normalizedSearch),
  );
  const activeServices = services.filter((service) => service.active);
  const todayCount = (id: number) => appointments.filter((appointment) => appointment.professional_id === id && !["cancelado", "nao_compareceu"].includes(appointment.status)).length;
  const workingDays = Array.isArray(settings?.days) ? settings.days as number[] : [];

  return (
    <Screen admin title="Clientes" dashboard busy={busy && !services.length && !clients.length}>
      <View style={styles.brandHeader}>
        <Text style={styles.brandOverline}>E S P A Ç O</Text>
        <Text style={styles.brandName}>Josiane Marine</Text>
        <Text style={styles.brandTagline}>B E L E Z A   Q U E   R E A L Ç A   V O C Ê</Text>
      </View>

      <View style={styles.sectionTabs}>
        {sections.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: section === item.id }}
            onPress={() => { setSection(item.id); setError(""); setMessage(""); resetForm(); }}
            style={[styles.sectionTab, section === item.id && styles.sectionTabActive]}
          >
            <Text style={[styles.sectionTabText, section === item.id && styles.sectionTabTextActive]} numberOfLines={1}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Notice error message={error} />
      <Notice message={message} />

      {section === "horarios" && settings && (
        <View style={styles.contentStack}>
          <View style={styles.hoursIntro}>
            <Text style={styles.sectionTitle}>Funcionamento</Text>
            <Muted>Configure os dias e horários em que o estabelecimento recebe clientes.</Muted>
          </View>
          <View style={styles.panel}>
            <View style={styles.panelHeading}>
              <Ionicons name="time-outline" size={22} color={colors.accent} />
              <Text style={styles.panelTitle}>Dias de atendimento</Text>
            </View>
            <View style={styles.weekdayRow}>
              {weekdays.map((day, index) => {
                const selected = workingDays.includes(index);
                return (
                  <Pressable
                    key={day}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    onPress={() => setSettings({
                      ...settings,
                      days: selected ? workingDays.filter((value) => value !== index) : [...workingDays, index].sort(),
                    })}
                    style={[styles.weekday, selected && styles.weekdaySelected]}
                  >
                    <Text style={[styles.weekdayText, selected && styles.weekdayTextSelected]}>
                      {compact ? day.slice(0, 1) : day}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.hoursFields}>
              <View style={styles.hourField}>
                <Field label="Abre às" value={timeOnly(settings.opening_time)} onChangeText={(value) => setSettings({ ...settings, opening_time: value })} placeholder="09:00" />
              </View>
              <View style={styles.hourField}>
                <Field label="Fecha às" value={timeOnly(settings.closing_time)} onChangeText={(value) => setSettings({ ...settings, closing_time: value })} placeholder="19:00" />
              </View>
            </View>
            <Button title="Salvar funcionamento" disabled={busy || !workingDays.length} onPress={() => void saveHours()} />
          </View>
          <View style={styles.infoPanel}>
            <Ionicons name="information-circle-outline" size={20} color={colors.accent} />
            <Text style={styles.infoText}>Folgas e bloqueios de profissionais são gerenciados na aba Profissionais.</Text>
          </View>
        </View>
      )}

      {section === "clientes" && (
        <View style={styles.contentStack}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={20} color={colors.muted} />
            <Field label="Buscar por nome, telefone ou e-mail" value={clientSearch} onChangeText={setClientSearch} placeholder="Buscar clientes" />
          </View>
          {filteredClients.map((client) => (
            <Pressable key={client.id} onPress={() => setSelectedClient(client)} style={styles.clientCard}>
              <View style={styles.initialsCircle}><Text style={styles.initialsText}>{initials(client.name)}</Text></View>
              <View style={styles.clientDetails}>
                <Text style={styles.cardTitle} numberOfLines={1}>{client.name}</Text>
                <Text style={styles.secondaryText} numberOfLines={1}>{client.phone || client.email || "Contato não informado"}</Text>
              </View>
              <View style={[styles.statusBadge, client.active === false || client.active === 0 ? styles.statusInactive : styles.statusActive]}>
                <Text style={styles.statusBadgeText}>{client.active === false || client.active === 0 ? "Inativo" : "Ativa"}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>
          ))}
          {!filteredClients.length && (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={30} color={colors.muted} />
              <Text style={styles.emptyTitle}>{clientSearch ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}</Text>
              <Muted>{clientSearch ? "Tente buscar por outro nome ou telefone." : "Os clientes aparecerão aqui depois de criarem uma conta."}</Muted>
            </View>
          )}
        </View>
      )}

      {section === "servicos" && (
        <View style={styles.contentStack}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
            {serviceCategories.map((category) => (
              <Pressable key={category} onPress={() => setServiceCategory(category)} style={[styles.filterChip, serviceCategory === category && styles.filterChipActive]}>
                <Text style={[styles.filterText, serviceCategory === category && styles.filterTextActive]}>{category}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={styles.statusFilters}>
            {([ ["ativos", "Ativos"], ["inativos", "Inativos"], ["todos", "Todos"] ] as [string, string][]).map(([id, label]) => (
              <Pressable key={id} onPress={() => setActiveFilter(id)} style={[styles.statusFilter, activeFilter === id && styles.statusFilterActive]}>
                <Text style={[styles.statusFilterText, activeFilter === id && styles.statusFilterTextActive]}>{label}</Text>
              </Pressable>
            ))}
          </View>
          {filteredServices.map((service) => {
            const category = categoryFor(service);
            return (
              <View key={service.id} style={styles.serviceCard}>
                <View style={styles.serviceIcon}><Ionicons name={serviceIcon(category)} size={24} color={colors.text} /></View>
                <Pressable onPress={() => startServiceEdit(service)} style={styles.serviceInfo}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{service.name}</Text>
                  <Text style={styles.secondaryText}>{category}</Text>
                  <View style={styles.durationRow}><Ionicons name="time-outline" size={13} color={colors.muted} /><Text style={styles.secondaryText}>{service.duration} min</Text></View>
                </Pressable>
                <View style={styles.serviceMeta}>
                  <View style={[styles.statusBadge, service.active ? styles.statusActive : styles.statusInactive]}>
                    <Text style={styles.statusBadgeText}>{service.active ? "Ativo" : "Inativo"}</Text>
                  </View>
                  <Text style={styles.servicePrice}>{brl(service.price)}</Text>
                </View>
                <View style={styles.cardActions}>
                  <Pressable accessibilityLabel={`Editar ${service.name}`} onPress={() => startServiceEdit(service)} style={styles.iconAction}>
                    <Ionicons name="create-outline" size={19} color={colors.muted} />
                  </Pressable>
                  <Pressable accessibilityLabel={`Excluir ${service.name}`} onPress={() => confirmAction("Excluir serviço", `Deseja excluir ${service.name}? Serviços com agendamentos serão desativados para preservar o histórico.`, () => void deleteService(service))} style={styles.iconAction}>
                    <Ionicons name="trash-outline" size={18} color="#ce829f" />
                  </Pressable>
                </View>
              </View>
            );
          })}
          {!filteredServices.length && <View style={styles.emptyState}><Text style={styles.emptyTitle}>Nenhum serviço nesta categoria</Text><Muted>Use o botão + para cadastrar um serviço.</Muted></View>}
        </View>
      )}

      {section === "profissionais" && (
        <View style={styles.contentStack}>
          <View style={styles.statusFilters}>
            {([ ["ativos", "Ativos"], ["inativos", "Inativos"], ["todos", "Todos"] ] as [string, string][]).map(([id, label]) => (
              <Pressable key={id} onPress={() => setActiveFilter(id)} style={[styles.statusFilter, activeFilter === id && styles.statusFilterActive]}>
                <Text style={[styles.statusFilterText, activeFilter === id && styles.statusFilterTextActive]}>{label}</Text>
              </Pressable>
            ))}
          </View>
          {filteredProfessionals.map((professional) => {
            const count = todayCount(professional.id);
            const inProgress = appointments.some((appointment) => appointment.professional_id === professional.id && appointment.status === "em_atendimento");
            const serviceNames = (professional.service_ids ?? []).map((id: number) => services.find((service) => service.id === id)?.name).filter(Boolean).join(" e ");
            return (
              <View key={professional.id} style={styles.professionalCard}>
                <View style={styles.initialsCircle}><Text style={styles.initialsText}>{initials(professional.name)}</Text></View>
                <Pressable onPress={() => startProfessionalEdit(professional)} style={styles.professionalInfo}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{professional.name}</Text>
                  <Text style={styles.secondaryText} numberOfLines={1}>{professional.specialty || serviceNames || "Profissional"}</Text>
                  <Text style={styles.secondaryText}>{professional.phone || professional.email || "Contato não informado"}</Text>
                  {count > 0 && <Text style={styles.appointmentsToday}>{count} atendimentos hoje</Text>}
                </Pressable>
                <View style={styles.proActions}>
                  <View style={[styles.statusBadge, inProgress ? styles.statusActive : professional.active ? styles.statusPink : styles.statusInactive]}>
                    <Text style={styles.statusBadgeText}>{!professional.active ? "Inativo" : inProgress ? "Em atendimento" : "Disponível"}</Text>
                  </View>
                  <View style={styles.inlineActions}>
                    <Pressable accessibilityLabel={`Registrar folga de ${professional.name}`} onPress={() => { setLeaveProfessional(professional.id); setFormType("folga"); }} style={styles.iconAction}>
                      <Ionicons name="calendar-outline" size={18} color={colors.accent} />
                    </Pressable>
                    <Pressable accessibilityLabel={`Editar ${professional.name}`} onPress={() => startProfessionalEdit(professional)} style={styles.iconAction}>
                      <Ionicons name="create-outline" size={18} color={colors.muted} />
                    </Pressable>
                    <Pressable accessibilityLabel={`Excluir ${professional.name}`} onPress={() => confirmAction("Excluir profissional", `Deseja excluir ${professional.name}? Quem tem agendamentos ou comissões será desativado para preservar o histórico.`, () => void deleteProfessional(professional))} style={styles.iconAction}>
                      <Ionicons name="trash-outline" size={17} color="#ce829f" />
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })}
          {!filteredProfessionals.length && <View style={styles.emptyState}><Text style={styles.emptyTitle}>Nenhum profissional cadastrado</Text><Muted>Use o botão + para adicionar a equipe.</Muted></View>}
          <View style={styles.leaveSection}>
            <View style={styles.panelHeading}>
              <Ionicons name="calendar-clear-outline" size={21} color={colors.accent} />
              <Text style={styles.panelTitle}>Folgas e bloqueios</Text>
            </View>
            {!blocks.length && <Muted>Nenhuma folga registrada.</Muted>}
            {blocks.map((block) => {
              const person = professionals.find((item) => item.id === block.professional_id);
              return (
                <View key={block.id} style={styles.blockRow}>
                  <View style={styles.blockCopy}>
                    <Text style={styles.cardTitle}>{block.reason || "Folga"}</Text>
                    <Text style={styles.secondaryText}>{person?.name ?? "Todo o salão"}</Text>
                    <Text style={styles.secondaryText}>{new Date(block.start).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} – {new Date(block.end).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</Text>
                  </View>
                  <Pressable accessibilityLabel="Remover folga" onPress={() => confirmAction("Remover bloqueio", "Deseja remover esta folga da agenda?", () => void perform(() => request(`/blocks/${block.id}`, "DELETE"), "Folga removida."))} style={styles.iconAction}>
                    <Ionicons name="trash-outline" size={18} color="#ce829f" />
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {(section === "servicos" || section === "profissionais") && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={section === "servicos" ? "Novo serviço" : "Novo profissional"}
          onPress={() => { resetForm(); setFormType(section === "servicos" ? "servico" : "profissional"); }}
          style={styles.fab}
        >
          <Ionicons name="add" size={34} color="#fff" />
        </Pressable>
      )}

      <Modal
        transparent
        animationType="slide"
        visible={formType !== null || selectedClient !== null}
        onRequestClose={() => { resetForm(); setSelectedClient(null); }}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => { resetForm(); setSelectedClient(null); }}>
          <Pressable style={styles.modalSheet} onPress={(event) => event.stopPropagation()}>
            <View style={styles.modalHandle} />
            {selectedClient ? (
              <>
                <View style={styles.clientModalHeader}>
                  <View style={styles.initialsCircle}><Text style={styles.initialsText}>{initials(selectedClient.name)}</Text></View>
                  <View style={styles.clientDetails}>
                    <Text style={styles.panelTitle}>{selectedClient.name}</Text>
                    <Text style={styles.secondaryText}>{selectedClient.active === false || selectedClient.active === 0 ? "Cliente inativo" : "Cliente ativo"}</Text>
                  </View>
                </View>
                <View style={styles.detailLine}><Ionicons name="call-outline" size={18} color={colors.accent} /><Text style={styles.detailText}>{selectedClient.phone || "Telefone não informado"}</Text></View>
                <View style={styles.detailLine}><Ionicons name="mail-outline" size={18} color={colors.accent} /><Text style={styles.detailText}>{selectedClient.email || "E-mail não informado"}</Text></View>
                {selectedClient.notes ? <Text style={styles.detailText}>{selectedClient.notes}</Text> : null}
                <Button secondary title="Fechar" onPress={() => setSelectedClient(null)} />
              </>
            ) : formType === "servico" ? (
              <ScrollView keyboardShouldPersistTaps="handled">
                <Text style={styles.modalTitle}>{editId ? "Editar serviço" : "Novo serviço"}</Text>
                <Field label="Nome do serviço" value={name} onChangeText={setName} />
                <Field label="Descrição" value={description} onChangeText={setDescription} />
                <Field label="Preço (R$)" value={price} onChangeText={setPrice} numeric />
                <View style={styles.hoursFields}>
                  <View style={styles.hourField}><Field label="Duração (min)" value={duration} onChangeText={setDuration} numeric /></View>
                  <View style={styles.hourField}><Field label="Intervalo (min)" value={buffer} onChangeText={setBuffer} numeric /></View>
                </View>
                <Chips items={[{ id: 1, label: "Ativo" }, { id: 0, label: "Inativo" }]} value={active} onSelect={setActive} />
                <Button title={editId ? "Salvar alterações" : "Cadastrar serviço"} disabled={busy || !name || !price} onPress={() => safeSubmit(saveService, setError)} />
                {editId > 0 && <Button secondary title="Cancelar edição" onPress={resetForm} />}
              </ScrollView>
            ) : formType === "profissional" ? (
              <ScrollView keyboardShouldPersistTaps="handled">
                <Text style={styles.modalTitle}>{editId ? "Editar profissional" : "Novo profissional"}</Text>
                <Field label="Nome completo" value={name} onChangeText={setName} />
                <Field label="Telefone" value={phone} onChangeText={setPhone} numeric />
                <Field label="E-mail" value={email} onChangeText={setEmail} />
                <Text style={styles.formLabel}>Especialidades</Text>
                <Text style={styles.specialtyHint}>Cada especialidade inclui automaticamente todos os serviços ativos da categoria.</Text>
                <View style={styles.selectionGrid}>
                  {serviceCategories.slice(1).map((category) => {
                    const selected = specialties.includes(category);
                    const count = activeServices.filter((service) => categoryFor(service) === category).length;
                    return (
                      <Pressable
                        key={category}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: selected }}
                        disabled={!count && !selected}
                        onPress={() => toggleSpecialty(category)}
                        style={[styles.selectionChip, selected && styles.selectionChipActive, !count && styles.selectionChipDisabled]}
                      >
                        <Text style={[styles.selectionText, selected && styles.selectionTextActive]}>{category}{count ? ` · ${count}` : ""}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <View style={styles.groupedServices}>
                  {specialties.map((category) => {
                    const grouped = activeServices.filter((service) => categoryFor(service) === category);
                    if (!grouped.length) return null;
                    return (
                      <View key={category} style={styles.specialtyGroup}>
                        <View style={styles.specialtyGroupHeading}>
                          <Ionicons name={serviceIcon(category)} size={16} color={colors.accent} />
                          <Text style={styles.specialtyGroupTitle}>{category}</Text>
                        </View>
                        <Text style={styles.specialtyServices}>{grouped.map((service) => service.name).join(", ")}</Text>
                      </View>
                    );
                  })}
                  {!specialties.length && <Muted>Selecione uma especialidade para vincular os serviços correspondentes.</Muted>}
                </View>
                <Chips items={[{ id: 1, label: "Ativo" }, { id: 0, label: "Inativo" }]} value={active} onSelect={setActive} />
                <Button title={editId ? "Salvar alterações" : "Cadastrar profissional"} disabled={busy || !name} onPress={() => safeSubmit(saveProfessional, setError)} />
                {editId > 0 && <Button secondary title="Cancelar edição" onPress={resetForm} />}
              </ScrollView>
            ) : formType === "folga" ? (
              <ScrollView keyboardShouldPersistTaps="handled">
                <Text style={styles.modalTitle}>Registrar folga</Text>
                <Text style={styles.formLabel}>Profissional</Text>
                <View style={styles.selectionGrid}>
                  {professionals.filter((person) => person.active).map((person) => (
                    <Pressable key={person.id} onPress={() => setLeaveProfessional(person.id)} style={[styles.selectionChip, leaveProfessional === person.id && styles.selectionChipActive]}>
                      <Text style={[styles.selectionText, leaveProfessional === person.id && styles.selectionTextActive]}>{person.name}</Text>
                    </Pressable>
                  ))}
                </View>
                <Field label="Data (AAAA-MM-DD)" value={leaveDate} onChangeText={setLeaveDate} />
                <View style={styles.hoursFields}>
                  <View style={styles.hourField}><Field label="Início (HH:MM)" value={leaveStart} onChangeText={setLeaveStart} /></View>
                  <View style={styles.hourField}><Field label="Fim (HH:MM)" value={leaveEnd} onChangeText={setLeaveEnd} /></View>
                </View>
                <Field label="Motivo" value={leaveReason} onChangeText={setLeaveReason} />
                <Button title="Salvar folga" disabled={busy || !leaveProfessional} onPress={() => safeSubmit(saveLeave, setError)} />
              </ScrollView>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

function safeSubmit(fn: () => Promise<void>, setError: (value: string) => void) {
  void fn().catch((error) => setError((error as Error).message));
}

const styles = {
  brandHeader: { alignItems: "center" as const, paddingTop: 4, paddingBottom: 10 },
  brandOverline: { color: colors.muted, fontSize: 10, letterSpacing: 4 },
  brandName: { color: colors.text, fontFamily: "serif", fontSize: 32, lineHeight: 38 },
  brandTagline: { color: colors.muted, fontSize: 8, letterSpacing: 1.5, marginTop: 2 },
  sectionTabs: { minHeight: 54, flexDirection: "row" as const, padding: 3, borderRadius: 30, backgroundColor: "#1a181b", borderWidth: 1, borderColor: "#302b31" },
  sectionTab: { flex: 1 as const, minWidth: 0 as const, alignItems: "center" as const, justifyContent: "center" as const, paddingHorizontal: 5, borderRadius: 26 },
  sectionTabActive: { backgroundColor: colors.accent },
  sectionTabText: { color: colors.text, fontSize: 12 },
  sectionTabTextActive: { color: "#fff", fontWeight: "600" as const },
  contentStack: { gap: 11 },
  hoursIntro: { gap: 4, marginTop: 3 },
  sectionTitle: { color: colors.text, fontFamily: "serif", fontSize: 23 },
  panel: { gap: 12, padding: 16, borderRadius: 20, backgroundColor: "#1a181b", borderWidth: 1, borderColor: "#2b272d" },
  panelHeading: { flexDirection: "row" as const, alignItems: "center" as const, gap: 10 },
  panelTitle: { color: colors.text, fontSize: 16, fontWeight: "600" as const },
  weekdayRow: { flexDirection: "row" as const, justifyContent: "space-between" as const, gap: 6, marginVertical: 3 },
  weekday: { flex: 1 as const, aspectRatio: 1, maxHeight: 44, alignItems: "center" as const, justifyContent: "center" as const, borderRadius: 24, backgroundColor: "#252226", borderWidth: 1, borderColor: "#3b333c" },
  weekdaySelected: { backgroundColor: "#713a5c", borderColor: colors.accent },
  weekdayText: { color: colors.muted, fontSize: 12 },
  weekdayTextSelected: { color: "#fff", fontWeight: "600" as const },
  hoursFields: { flexDirection: "row" as const, gap: 10 },
  hourField: { flex: 1 as const, minWidth: 0 as const },
  infoPanel: { flexDirection: "row" as const, alignItems: "center" as const, gap: 9, padding: 13, borderRadius: 14, backgroundColor: "#211c23" },
  infoText: { flex: 1 as const, color: colors.muted, fontSize: 12, lineHeight: 18 },
  searchBox: { minHeight: 52, flexDirection: "row" as const, alignItems: "center" as const, gap: 10, paddingHorizontal: 14, borderRadius: 28, backgroundColor: "#211f23" },
  clientCard: { minHeight: 83, flexDirection: "row" as const, alignItems: "center" as const, gap: 12, paddingHorizontal: 14, borderRadius: 18, backgroundColor: "#1a181b" },
  initialsCircle: { width: 48, height: 48, borderRadius: 27, alignItems: "center" as const, justifyContent: "center" as const, backgroundColor: "#8a436f" },
  initialsText: { color: "#fff", fontSize: 16, fontWeight: "600" as const },
  clientDetails: { flex: 1 as const, minWidth: 0 as const, gap: 5 },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: "500" as const },
  secondaryText: { color: colors.muted, fontSize: 13 },
  statusBadge: { alignSelf: "flex-start" as const, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 22 },
  statusActive: { backgroundColor: "#24452f" },
  statusPink: { backgroundColor: "#713a5c" },
  statusInactive: { backgroundColor: "#37343a" },
  statusBadgeText: { color: colors.text, fontSize: 11, fontWeight: "500" as const },
  filtersRow: { gap: 8, paddingVertical: 2 },
  filterChip: { minHeight: 40, justifyContent: "center" as const, paddingHorizontal: 17, borderRadius: 24, backgroundColor: "#1a181b" },
  filterChipActive: { backgroundColor: colors.accent },
  filterText: { color: colors.text, fontSize: 13 },
  filterTextActive: { color: "#fff", fontWeight: "600" as const },
  statusFilters: { flexDirection: "row" as const, gap: 7 },
  statusFilter: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 20, backgroundColor: "#1b191d" },
  statusFilterActive: { backgroundColor: "#343037" },
  statusFilterText: { color: colors.muted, fontSize: 12 },
  statusFilterTextActive: { color: colors.text },
  serviceCard: { minHeight: 104, flexDirection: "row" as const, alignItems: "center" as const, gap: 10, padding: 12, borderRadius: 20, backgroundColor: "#1a181b" },
  serviceIcon: { width: 50, height: 50, borderRadius: 26, alignItems: "center" as const, justifyContent: "center" as const, backgroundColor: "#302d33" },
  serviceInfo: { flex: 1 as const, minWidth: 0 as const, gap: 4 },
  durationRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 4 },
  serviceMeta: { alignItems: "flex-end" as const, gap: 8 },
  servicePrice: { color: colors.accent, fontSize: 16, fontWeight: "500" as const },
  cardActions: { gap: 3 },
  iconAction: { width: 30, height: 30, alignItems: "center" as const, justifyContent: "center" as const },
  professionalCard: { minHeight: 112, flexDirection: "row" as const, alignItems: "center" as const, gap: 11, padding: 13, borderRadius: 20, backgroundColor: "#1a181b" },
  professionalInfo: { flex: 1 as const, minWidth: 0 as const, gap: 4 },
  appointmentsToday: { color: colors.muted, fontSize: 11, marginTop: 2 },
  proActions: { alignItems: "flex-end" as const, gap: 8 },
  inlineActions: { flexDirection: "row" as const, alignItems: "center" as const },
  leaveSection: { gap: 8, padding: 14, borderRadius: 18, backgroundColor: "#1a181b" },
  blockRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8, paddingVertical: 9, borderTopWidth: 1, borderTopColor: "#302b31" },
  blockCopy: { flex: 1 as const, gap: 3 },
  emptyState: { minHeight: 150, alignItems: "center" as const, justifyContent: "center" as const, gap: 9, padding: 20, borderRadius: 18, backgroundColor: "#1a181b" },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: "500" as const, textAlign: "center" as const },
  fab: { width: 58, height: 58, alignSelf: "flex-end" as const, alignItems: "center" as const, justifyContent: "center" as const, marginTop: 1, marginBottom: 7, borderRadius: 32, backgroundColor: colors.accent, elevation: 5 },
  modalBackdrop: { flex: 1, justifyContent: "flex-end" as const, backgroundColor: "rgba(0,0,0,0.68)" },
  modalSheet: { width: "100%" as const, maxWidth: 620, maxHeight: "88%" as const, alignSelf: "center" as const, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28, borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: "#1a181b" },
  modalHandle: { width: 42, height: 4, alignSelf: "center" as const, borderRadius: 3, backgroundColor: "#5a5059", marginBottom: 16 },
  modalTitle: { color: colors.text, fontSize: 21, fontWeight: "600" as const, marginBottom: 17 },
  formLabel: { color: colors.muted, fontSize: 13, marginBottom: 8 },
  selectionGrid: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 7, marginBottom: 13 },
  selectionChip: { paddingHorizontal: 13, paddingVertical: 10, borderRadius: 22, borderWidth: 1, borderColor: "#443a45", backgroundColor: "#252226" },
  selectionChipActive: { borderColor: colors.accent, backgroundColor: "#713a5c" },
  selectionChipDisabled: { opacity: 0.42 },
  selectionText: { color: colors.muted, fontSize: 13 },
  selectionTextActive: { color: "#fff" },
  specialtyHint: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: -8, marginBottom: 3 },
  groupedServices: { gap: 10, marginBottom: 4 },
  specialtyGroup: { padding: 12, borderRadius: 14, backgroundColor: "#252226", gap: 7 },
  specialtyGroupHeading: { flexDirection: "row" as const, alignItems: "center" as const, gap: 7 },
  specialtyGroupTitle: { color: colors.text, fontSize: 13, fontWeight: "600" as const },
  specialtyServices: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  clientModalHeader: { flexDirection: "row" as const, alignItems: "center" as const, gap: 12, marginBottom: 16 },
  detailLine: { flexDirection: "row" as const, alignItems: "center" as const, gap: 10, paddingVertical: 11, borderTopWidth: 1, borderTopColor: "#302b31" },
  detailText: { color: colors.text, fontSize: 14 },
};
