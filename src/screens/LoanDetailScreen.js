import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TextInput, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import Row from "../components/Row";
import Card from "../components/Card";
import ERButton from "../components/ERButton";

import { formatCOP, parseCOP } from "../utils/money";
import { todayISO } from "../utils/dates";
import { run } from "../db/db";
import { listAccounts, loanPayments, loanBalance, addLoanPayment } from "../db/queries";

export default function LoanDetailScreen({ route, navigation }) {
  const { loanId } = route.params;

  const [loan, setLoan] = useState(null);
  const [payments, setPayments] = useState([]);
  const [bal, setBal] = useState({ remaining: 0, direction: "i_owe" });

  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [accounts, setAccounts] = useState([]);

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
    setBal(await loanBalance(loanId));

    const acc = await listAccounts();
    setAccounts(acc);
    if (!accountId && acc[0]) setAccountId(String(acc[0].id));
  }

  useEffect(() => {
    const unsub = navigation.addListener("focus", load);
    load();
    return unsub;
  }, [navigation]);

  if (!loan) return null;

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
                Principal:{" "}
                <Text style={{ color: "#f2e3b6", fontWeight: "900" }}>{formatCOP(loan.principal)}</Text>
              </Text>
              <Text style={{ color: "#d9cfac" }}>
                Pendiente:{" "}
                <Text style={{ color: "#f2e3b6", fontWeight: "900" }}>{formatCOP(bal.remaining)}</Text>
              </Text>
            </View>
          </Card>
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
        <Card
          title="Registrar pago"
          subtitle="Pago parcial o total"
          right={<Ionicons name="cash" size={18} color="#caa85a" />}
        >
          <View style={{ gap: 10 }}>
            <View>
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

            <View>
              <Text style={labelStyle}>Cuenta (ID)</Text>
              <TextInput
                value={accountId}
                onChangeText={setAccountId}
                placeholder="1"
                placeholderTextColor="#6f6754"
                keyboardType="numeric"
                style={inputStyle}
              />
              <Text style={hintStyle}>
                Cuentas: {accounts.map((a) => `${a.id}:${a.name}`).join(" · ")}
              </Text>
            </View>

            <ERButton
              title="Guardar pago"
              onPress={async () => {
                const a = parseCOP(amount);
                if (!a) return Alert.alert("Monto inválido");
                if (!accountId) return Alert.alert("Cuenta requerida");
                if (a > (bal.remaining || 0)) {
                  return Alert.alert("Excede pendiente", "El pago no puede ser mayor al saldo pendiente.");
                }

                await addLoanPayment({
                  loanId,
                  date: todayISO(),
                  amount: a,
                  accountId: Number(accountId),
                  note: null,
                });

                // auto cerrar si quedó en 0
                const nb = await loanBalance(loanId);
                if (nb.remaining === 0) {
                  await run(`UPDATE loans SET status='closed' WHERE id=?`, [loanId]);
                }

                setAmount("");
                await load();
              }}
            />

            <ERButton title="Volver" variant="secondary" onPress={() => navigation.goBack()} />
          </View>
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
                  subtitle={`Cuenta: ${p.account_name}`}
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
