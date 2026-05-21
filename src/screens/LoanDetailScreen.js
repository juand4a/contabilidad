import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TextInput, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";

import Row from "../components/Row";
import Card from "../components/Card";
import ERButton from "../components/ERButton";

import { formatCOP, parseCOP } from "../utils/money";
import { todayISO } from "../utils/dates";
import { run } from "../db/db";
import { listAccounts, loanPayments, loanBalance, addLoanPayment, listLoanInstallments } from "../db/queries";

export default function LoanDetailScreen({ route, navigation }) {
  const { loanId } = route.params;

  const [loan, setLoan] = useState(null);
  const [payments, setPayments] = useState([]);
  const [installments, setInstallments] = useState([]);
  const [bal, setBal] = useState({ remaining: 0, direction: "i_owe", paid: 0 });

  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayISO());
  const [accountId, setAccountId] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [selectedInstallmentId, setSelectedInstallmentId] = useState("");

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

  function dirLabel(d) {
    return d === "i_owe" ? "Tú debes" : "Te deben";
  }

  function dirIcon(d) {
    return d === "i_owe" ? "skull" : "hand-left";
  }

  async function load() {
    const r = await run(`SELECT * FROM loans WHERE id=?`, [loanId]);
    const one = r.rows.item(0);
    setLoan(one);

    setPayments(await loanPayments(loanId));
    setInstallments(await listLoanInstallments(loanId));
    setBal(await loanBalance(loanId));

    const acc = await listAccounts();
    setAccounts(acc);
    if (!accountId && acc[0]) setAccountId(String(acc[0].id));
  }

  useEffect(() => {
    const unsub = navigation.addListener("focus", load);
    load();
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation]);

  if (!loan) return null;

  const selectedInstallment = installments.find((i) => String(i.id) === String(selectedInstallmentId));
  const pendingInstallments = installments.filter((i) => i.status !== "paid");
  const paidPct = loan.principal ? Math.min(1, (bal.paid || 0) / loan.principal) : 0;

  async function savePayment() {
    const a = parseCOP(amount);
    if (!a) return Alert.alert("Monto inválido");
    if (!accountId) return Alert.alert("Cuenta requerida");
    if (a > (bal.remaining || 0)) {
      return Alert.alert("Excede pendiente", "El pago no puede ser mayor al saldo pendiente.");
    }

    await addLoanPayment({
      loanId,
      date: paymentDate || todayISO(),
      amount: a,
      accountId: Number(accountId),
      installmentId: selectedInstallmentId ? Number(selectedInstallmentId) : null,
      note: selectedInstallment ? `Pago cuota ${selectedInstallment.number}` : null,
    });

    const nb = await loanBalance(loanId);
    if (nb.remaining === 0) {
      await run(`UPDATE loans SET status='closed' WHERE id=?`, [loanId]);
    }

    setAmount("");
    setSelectedInstallmentId("");
    await load();
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#070708" }}>
      <View style={{ padding: 16, paddingTop: 18 }}>
        <Text style={{ color: "#a59a7a", letterSpacing: 2, fontWeight: "700" }}>DEBT SIGIL</Text>

        <Text style={{ color: "#f2e3b6", fontSize: 22, fontWeight: "900", marginTop: 10 }}>
          {loan.person}
        </Text>

        <Text style={{ color: "#8f866c", marginTop: 6 }}>{dirLabel(loan.direction)}</Text>

        <View style={{ marginTop: 12 }}>
          <Card
            title="Estado"
            subtitle={loan.status === "closed" ? "Cerrado" : "Abierto"}
            right={<Ionicons name={dirIcon(loan.direction)} size={18} color="#caa85a" />}
          >
            <View style={{ gap: 6 }}>
              <Text style={{ color: "#d9cfac" }}>
                Principal: <Text style={{ color: "#f2e3b6", fontWeight: "900" }}>{formatCOP(loan.principal)}</Text>
              </Text>
              <Text style={{ color: "#d9cfac" }}>
                Pagado: <Text style={{ color: "#f2e3b6", fontWeight: "900" }}>{formatCOP(bal.paid || 0)}</Text>
              </Text>
              <Text style={{ color: "#d9cfac" }}>
                Pendiente: <Text style={{ color: "#f2e3b6", fontWeight: "900" }}>{formatCOP(bal.remaining)}</Text>
              </Text>
              <View style={{ height: 10, borderRadius: 999, borderWidth: 1, borderColor: "#3b2f16", backgroundColor: "#141114", overflow: "hidden", marginTop: 6 }}>
                <View style={{ width: `${Math.round(paidPct * 100)}%`, height: "100%", backgroundColor: "#caa85a" }} />
              </View>
              <Text style={{ color: "#8f866c" }}>{Math.round(paidPct * 100)}% pagado</Text>
            </View>
          </Card>
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
        <Card
          title="Registrar pago"
          subtitle="Pago parcial, total o asociado a una cuota"
          right={<Ionicons name="cash" size={18} color="#caa85a" />}
        >
          <View style={{ gap: 10 }}>
            <View>
              <Text style={labelStyle}>Cuota a pagar (opcional)</Text>
              <View style={{ borderWidth: 1, borderColor: "#3b2f16", backgroundColor: "#0b0b0c", borderRadius: 8, marginBottom: 18, overflow: "hidden" }}>
                <Picker
                  selectedValue={selectedInstallmentId}
                  onValueChange={(value) => {
                    setSelectedInstallmentId(value);
                    const inst = installments.find((i) => String(i.id) === String(value));
                    if (inst) setAmount(String(Math.max(0, (inst.amount || 0) - (inst.paid_amount || 0))));
                  }}
                  style={{ height: 50, color: "#f2e3b6" }}
                >
                  <Picker.Item label="Pago general" value="" />
                  {pendingInstallments.map((inst) => (
                    <Picker.Item
                      key={inst.id}
                      label={`Cuota ${inst.number} · vence ${inst.due_date} · ${formatCOP(Math.max(0, inst.amount - (inst.paid_amount || 0)))}`}
                      value={String(inst.id)}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={labelStyle}>Fecha</Text>
                <TextInput
                  value={paymentDate}
                  onChangeText={setPaymentDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#6f6754"
                  style={inputStyle}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={labelStyle}>Monto (COP)</Text>
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0"
                  placeholderTextColor="#6f6754"
                  keyboardType="numeric"
                  style={inputStyle}
                />
              </View>
            </View>

            <View>
              <Text style={labelStyle}>Cuenta</Text>
              <View style={{ borderWidth: 1, borderColor: "#3b2f16", backgroundColor: "#0b0b0c", borderRadius: 8, marginBottom: 18, overflow: "hidden" }}>
                <Picker selectedValue={accountId} onValueChange={setAccountId} style={{ height: 50, color: "#f2e3b6" }}>
                  {accounts.map((a) => (
                    <Picker.Item key={a.id} label={`${a.name} · ${a.type}`} value={String(a.id)} />
                  ))}
                </Picker>
              </View>
              <Text style={hintStyle}>Puedes pagar desde banco, billetera o efectivo.</Text>
            </View>

            <ERButton title="Guardar pago" onPress={savePayment} />
            <ERButton title="Volver" variant="secondary" onPress={() => navigation.goBack()} />
          </View>
        </Card>

        <Card
          title="Plan de cuotas"
          subtitle={installments.length ? "Toca una cuota para cargarla en el pago" : "Este registro no tiene cuotas programadas"}
          right={<Ionicons name="calendar" size={18} color="#caa85a" />}
        >
          {installments.length === 0 ? (
            <Text style={{ color: "#a59a7a" }}>
              Los registros antiguos no tenían plan de cuotas. Puedes seguir abonando con pago general.
            </Text>
          ) : (
            <View style={{ borderWidth: 1, borderColor: "#3b2f16", borderRadius: 14, overflow: "hidden" }}>
              {installments.map((inst) => {
                const pending = Math.max(0, (inst.amount || 0) - (inst.paid_amount || 0));
                return (
                  <Row
                    key={inst.id}
                    title={`${inst.status === "paid" ? "✓" : "⏳"} Cuota ${inst.number} · ${formatCOP(inst.amount)}`}
                    subtitle={`Vence: ${inst.due_date} · Pagado: ${formatCOP(inst.paid_amount || 0)} · Pendiente: ${formatCOP(pending)}`}
                    right={inst.notification_id ? "🔔" : inst.status === "paid" ? "OK" : "›"}
                    iconLeft={<Ionicons name={inst.status === "paid" ? "checkmark" : "time"} size={16} color="#caa85a" />}
                    onPress={() => {
                      if (inst.status === "paid") return;
                      setSelectedInstallmentId(String(inst.id));
                      setAmount(String(pending));
                    }}
                  />
                );
              })}
            </View>
          )}
        </Card>

        <Card
          title="Pagos"
          subtitle={payments.length ? "Historial de pagos" : "Aún no hay pagos"}
          right={<Ionicons name="list" size={18} color="#caa85a" />}
        >
          {payments.length === 0 ? (
            <Text style={{ color: "#a59a7a" }}>
              Cuando registres pagos, aparecerán aquí.
            </Text>
          ) : (
            <View style={{ borderWidth: 1, borderColor: "#3b2f16", borderRadius: 14, overflow: "hidden" }}>
              {payments.map((p) => (
                <Row
                  key={p.id}
                  title={`${p.date} · ${formatCOP(p.amount)}`}
                  subtitle={`Cuenta: ${p.account_name}${p.installment_number ? ` · Cuota ${p.installment_number} (${p.installment_due_date})` : ""}`}
                  iconLeft={<Ionicons name="cash-outline" size={16} color="#caa85a" />}
                />
              ))}
            </View>
          )}
        </Card>
      </View>
    </ScrollView>
  );
}
