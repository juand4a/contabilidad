import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, TextInput, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";

import Row from "../components/Row";
import Card from "../components/Card";
import ERButton from "../components/ERButton";

import { formatCOP, parseCOP } from "../utils/money";
import { todayISO, addDaysISO } from "../utils/dates";
import { listLoans, loanBalance, createLoan, listAccounts, listLoanInstallments } from "../db/queries";
import { scheduleLoanInstallmentReminder } from "../utils/notifications";
import { run } from "../db/db";

export default function LoansScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [showNew, setShowNew] = useState(false);

  const [direction, setDirection] = useState("i_owe");
  const [person, setPerson] = useState("");
  const [principal, setPrincipal] = useState("");
  const [accountId, setAccountId] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [startDate, setStartDate] = useState(todayISO());
  const [firstDueDate, setFirstDueDate] = useState(addDaysISO(todayISO(), 30));
  const [installmentCount, setInstallmentCount] = useState("1");
  const [installmentAmount, setInstallmentAmount] = useState("");
  const [reminderDays, setReminderDays] = useState("2");

  const previewInstallment = useMemo(() => {
    const total = parseCOP(principal);
    const count = Math.max(1, Number(installmentCount || 1));
    if (!total || !count) return "";
    return formatCOP(Math.ceil(total / count));
  }, [principal, installmentCount]);

  const inputStyle = {
    borderWidth: 1,
    borderColor: "#3b2f16",
    backgroundColor: "#0b0b0c",
    color: "#f2e3b6",
    padding: 12,
    borderRadius: 12,
  };

  const labelStyle = {
    color: "#a59a7a",
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 6,
  };

  const hintStyle = { color: "#8f866c", marginTop: 6 };

  function loanIcon(dir) {
    return dir === "i_owe" ? "skull" : "hand-left";
  }

  async function load() {
    const acc = await listAccounts();
    setAccounts(acc);
    if (!accountId && acc[0]) setAccountId(String(acc[0].id));

    const loans = await listLoans();
    const enriched = [];
    for (const l of loans) {
      const b = await loanBalance(l.id);
      enriched.push({ ...l, remaining: b.remaining });
    }
    enriched.sort((a, b) => {
      if (a.status !== b.status) return a.status === "open" ? -1 : 1;
      if (a.next_due_date && b.next_due_date) return String(a.next_due_date).localeCompare(String(b.next_due_date));
      return (b.remaining || 0) - (a.remaining || 0);
    });
    setItems(enriched);
  }

  useEffect(() => {
    const unsub = navigation.addListener("focus", load);
    load();
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation]);

  async function scheduleInstallments(loanId) {
    try {
      const installments = await listLoanInstallments(loanId);
      for (const inst of installments) {
        const notificationId = await scheduleLoanInstallmentReminder({
          ...inst,
          loan_id: loanId,
          person: person.trim(),
          direction,
          reminder_days_before: Number(reminderDays || 0),
        });
        if (notificationId) {
          await run(`UPDATE loan_installments SET notification_id=? WHERE id=?`, [notificationId, inst.id]);
        }
      }
    } catch (e) {
      console.log("Loan reminder warn:", e);
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#070708" }}>
      <View style={{ padding: 16, paddingTop: 18, marginTop: 30 }}>
        <Text style={{ color: "#a59a7a", letterSpacing: 2, fontWeight: "700" }}>BOOK OF DEBTS</Text>
        <Text style={{ color: "#f2e3b6", fontSize: 22, fontWeight: "900", marginTop: 10 }}>
          Deudas, préstamos y cuotas
        </Text>
        <Text style={{ color: "#8f866c", marginTop: 6 }}>
          Controla lo que debes, lo que te deben y las fechas de cada cuota.
        </Text>

        <View style={{ marginTop: 14 }}>
          <ERButton
            title={showNew ? "Cerrar" : "Nueva deuda / préstamo"}
            variant={showNew ? "secondary" : "primary"}
            onPress={() => setShowNew(!showNew)}
          />
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
        {showNew ? (
          <Card
            title="Nuevo registro"
            subtitle="Puedes dividir una deuda en cuotas y programar alertas"
            right={<Ionicons name="calendar" size={18} color="#caa85a" />}
          >
            <View style={{ gap: 10 }}>
              <View>
                <Text style={labelStyle}>Dirección</Text>
                <View style={{ borderWidth: 1, borderColor: "#3b2f16", backgroundColor: "#0b0b0c", borderRadius: 8, marginBottom: 18, overflow: "hidden" }}>
                  <Picker selectedValue={direction} onValueChange={setDirection} style={{ height: 50, color: "#f2e3b6" }}>
                    <Picker.Item label="Yo debo / tengo que pagar" value="i_owe" />
                    <Picker.Item label="Me deben / tengo que cobrar" value="owed_to_me" />
                  </Picker>
                </View>
              </View>

              <View>
                <Text style={labelStyle}>Persona / entidad</Text>
                <TextInput
                  value={person}
                  onChangeText={setPerson}
                  placeholder="Banco, persona, proveedor..."
                  placeholderTextColor="#6f6754"
                  style={inputStyle}
                />
              </View>

              <View>
                <Text style={labelStyle}>Valor total (COP)</Text>
                <TextInput
                  value={principal}
                  onChangeText={setPrincipal}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#6f6754"
                  style={inputStyle}
                />
              </View>

              <View>
                <Text style={labelStyle}>Cuenta donde entra/sale el dinero</Text>
                <View style={{ borderWidth: 1, borderColor: "#3b2f16", backgroundColor: "#0b0b0c", borderRadius: 8, marginBottom: 18, overflow: "hidden" }}>
                  <Picker selectedValue={accountId} onValueChange={setAccountId} style={{ height: 50, color: "#f2e3b6" }}>
                    {accounts.map((account) => (
                      <Picker.Item key={account.id} label={`${account.name} · ${account.type}`} value={String(account.id)} />
                    ))}
                  </Picker>
                </View>
                <Text style={hintStyle}>Incluye efectivo, bancos, billeteras e inversiones.</Text>
              </View>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={labelStyle}>Fecha inicio</Text>
                  <TextInput
                    value={startDate}
                    onChangeText={setStartDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#6f6754"
                    style={inputStyle}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={labelStyle}>Primera cuota</Text>
                  <TextInput
                    value={firstDueDate}
                    onChangeText={setFirstDueDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#6f6754"
                    style={inputStyle}
                  />
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={labelStyle}>N° cuotas</Text>
                  <TextInput
                    value={installmentCount}
                    onChangeText={setInstallmentCount}
                    keyboardType="numeric"
                    placeholder="1"
                    placeholderTextColor="#6f6754"
                    style={inputStyle}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={labelStyle}>Valor cuota opcional</Text>
                  <TextInput
                    value={installmentAmount}
                    onChangeText={setInstallmentAmount}
                    keyboardType="numeric"
                    placeholder={previewInstallment || "Automático"}
                    placeholderTextColor="#6f6754"
                    style={inputStyle}
                  />
                </View>
              </View>
              <Text style={hintStyle}>Si dejas valor de cuota vacío, se divide automáticamente. Estimado: {previewInstallment || "$ 0"}.</Text>

              <View>
                <Text style={labelStyle}>Avisar cuántos días antes de cada cuota</Text>
                <TextInput
                  value={reminderDays}
                  onChangeText={setReminderDays}
                  keyboardType="numeric"
                  placeholder="2"
                  placeholderTextColor="#6f6754"
                  style={inputStyle}
                />
              </View>

              <ERButton
                title="Crear con cuotas"
                onPress={async () => {
                  if (!person.trim()) return Alert.alert("Falta persona");
                  const p = parseCOP(principal);
                  if (!p) return Alert.alert("Valor inválido");
                  if (!accountId) return Alert.alert("Cuenta requerida");

                  const dir = direction.trim();
                  if (dir !== "i_owe" && dir !== "owed_to_me") {
                    return Alert.alert("Dirección inválida", "Usa: i_owe o owed_to_me");
                  }

                  const count = Math.max(1, Number(installmentCount || 1));
                  const days = Math.max(0, Number(reminderDays || 0));
                  const optionalAmount = parseCOP(installmentAmount);

                  try {
                    const loanId = await createLoan({
                      direction: dir,
                      person: person.trim(),
                      principal: p,
                      interest_rate: 0,
                      start_date: startDate || todayISO(),
                      note: null,
                      accountId: Number(accountId),
                      first_due_date: firstDueDate || null,
                      installment_count: count,
                      installment_amount: optionalAmount,
                      reminder_days_before: days,
                    });

                    await scheduleInstallments(loanId);

                    Alert.alert("Éxito", "Registro creado con cuotas y alertas.");
                    setShowNew(false);
                    setPerson("");
                    setPrincipal("");
                    setInstallmentAmount("");
                    setInstallmentCount("1");
                    setReminderDays("2");
                    setStartDate(todayISO());
                    setFirstDueDate(addDaysISO(todayISO(), 30));
                    await load();
                  } catch (error) {
                    console.log(error);
                    Alert.alert("Error", "No se pudo crear el préstamo.");
                  }
                }}
              />
            </View>
          </Card>
        ) : null}

        <Card
          title="Registros"
          subtitle={items.length ? "Ordenado por vencimiento y saldo pendiente" : "Aún no hay deudas"}
          right={<Ionicons name="book" size={18} color="#caa85a" />}
        >
          {items.length === 0 ? (
            <Text style={{ color: "#a59a7a" }}>
              Crea una deuda o préstamo para registrar cuotas, vencimientos y pagos.
            </Text>
          ) : (
            <View style={{ borderWidth: 1, borderColor: "#3b2f16", borderRadius: 14, overflow: "hidden" }}>
              {items.map((l) => {
                const label = l.direction === "i_owe" ? "Debo" : "Me deben";
                const statusFlag = l.status === "closed" ? "⏸" : "✓";
                const next = l.next_due_date ? ` · Próx. cuota: ${l.next_due_date}` : "";
                const installments = l.pending_installments ? ` · Cuotas pend.: ${l.pending_installments}` : "";
                return (
                  <Row
                    key={l.id}
                    title={`${statusFlag} ${label}: ${l.person}`}
                    subtitle={`Pendiente: ${formatCOP(l.remaining)} · Total: ${formatCOP(l.principal)}${installments}${next}`}
                    right={l.next_due_date ? "🔔" : "›"}
                    iconLeft={<Ionicons name={loanIcon(l.direction)} size={16} color="#caa85a" />}
                    onPress={() => navigation.navigate("LoanDetail", { loanId: l.id })}
                  />
                );
              })}
            </View>
          )}
        </Card>
      </View>
    </ScrollView>
  );
}
