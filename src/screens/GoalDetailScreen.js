import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TextInput, Button, Alert } from "react-native";
import Row from "../components/Row";
import { run } from "../db/db";
import { todayISO } from "../utils/dates";
import { formatCOP, parseCOP } from "../utils/money";
import { listAccounts, goalBalance, goalContributions, addGoalContribution } from "../db/queries";

export default function GoalDetailScreen({ route, navigation }) {
  const { goalId } = route.params;

  const [goal, setGoal] = useState(null);
  const [saved, setSaved] = useState(0);
  const [items, setItems] = useState([]);

  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState("add"); // add|remove
  const [date, setDate] = useState(todayISO());
  const [accountId, setAccountId] = useState(""); // opcional
  const [accounts, setAccounts] = useState([]);

  async function load() {
    const g = await run(`SELECT * FROM goals WHERE id=?`, [goalId]);
    const one = g.rows.item(0);
    setGoal(one);

    const s = await goalBalance(goalId);
    setSaved(s);

    setItems(await goalContributions(goalId));

    const acc = await listAccounts();
    setAccounts(acc);
    if (!accountId && acc[0]) setAccountId(String(acc[0].id));
  }

  useEffect(() => {
    const unsub = navigation.addListener("focus", load);
    load();
    return unsub;
  }, [navigation]);

  if (!goal) return null;

  const pct = goal.target_amount ? saved / goal.target_amount : 0;

  return (
    <ScrollView style={{ flex: 1 }}>
      <View style={{ padding: 16, gap: 6 }}>
        <Text style={{ fontSize: 20, fontWeight: "900" }}>{goal.name}</Text>
        <Text>Meta: {formatCOP(goal.target_amount)}</Text>
        <Text style={{ fontWeight: "900" }}>Ahorrado: {formatCOP(saved)} ({Math.round(pct * 100)}%)</Text>
      </View>

      <View style={{ padding: 16, gap: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: "800" }}>Mover ahorro</Text>

        <Text>Modo (add/remove)</Text>
        <TextInput value={mode} onChangeText={setMode} style={{ borderWidth: 1, padding: 10 }} />

        <Text>Fecha (YYYY-MM-DD)</Text>
        <TextInput value={date} onChangeText={setDate} style={{ borderWidth: 1, padding: 10 }} />

        <Text>Monto (COP)</Text>
        <TextInput value={amount} onChangeText={setAmount} keyboardType="numeric" style={{ borderWidth: 1, padding: 10 }} />

        <Text>Cuenta (ID, opcional)</Text>
        <TextInput value={accountId} onChangeText={setAccountId} keyboardType="numeric" style={{ borderWidth: 1, padding: 10 }} />
        <Text style={{ color: "#666" }}>Cuentas: {accounts.map((a) => `${a.id}:${a.name}`).join(" · ")}</Text>

        <Button
          title={mode === "remove" ? "Retirar" : "Agregar"}
          onPress={async () => {
            const a = parseCOP(amount);
            if (!a) return Alert.alert("Monto inválido");

            const signed = mode === "remove" ? -Math.abs(a) : Math.abs(a);

            if (signed < 0 && Math.abs(signed) > saved) {
              return Alert.alert("No alcanza", "No puedes retirar más de lo que llevas ahorrado.");
            }

            await addGoalContribution({
              goalId,
              date,
              amount: signed,
              accountId: accountId ? Number(accountId) : null,
              note: null,
            });

            setAmount("");
            await load();
          }}
        />
      </View>

      <Text style={{ paddingHorizontal: 14, paddingTop: 6, fontSize: 16, fontWeight: "800" }}>Historial</Text>
      {items.map((c) => (
        <Row
          key={c.id}
          title={`${c.date} · ${formatCOP(c.amount)}`}
          subtitle={c.account_name ? `Cuenta: ${c.account_name}` : "Sin cuenta"}
        />
      ))}
    </ScrollView>
  );
}
