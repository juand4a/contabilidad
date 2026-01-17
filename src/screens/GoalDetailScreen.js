import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TextInput, Alert } from "react-native";
import Row from "../components/Row";
import ERButton from "../components/ERButton";  // Asumiendo que este es el componente que usas para botones
import { run } from "../db/db";
import { todayISO } from "../utils/dates";
import { formatCOP, parseCOP } from "../utils/money";
import { listAccounts, goalBalance, goalContributions, addGoalContribution } from "../db/queries";
import { Picker } from "@react-native-picker/picker"; // Importar Picker

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
    <ScrollView style={{ flex: 1, backgroundColor: "#070708" }}>
      <View style={{ padding: 18, gap: 6 }}>
        <Text style={{ fontSize: 22, fontWeight: "900", color: "#f2e3b6" }}>{goal.name}</Text>
        <Text style={{ color: "#a59a7a" }}>Meta: {formatCOP(goal.target_amount)}</Text>
        <Text style={{ fontWeight: "900", color: "#f2e3b6" }}>
          Ahorrado: {formatCOP(saved)} ({Math.round(pct * 100)}%)
        </Text>
      </View>

      <View style={{ padding: 16, gap: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: "800", color: "#f2e3b6" }}>Mover ahorro</Text>

        {/* Modo (add/remove) con Picker */}
        <Text style={{ color: "#a59a7a", marginBottom: 6 }}>Modo (add/remove)</Text>
        <View
          style={{
            borderWidth: 1,
            borderColor: "#3b2f16",
            backgroundColor: "#0b0b0c",
            borderRadius: 8,
            marginBottom: 18,
            overflow: "hidden",  // Asegura que el Picker no sobresalga de los bordes redondeados
          }}
        >
          <Picker
            selectedValue={mode}
            onValueChange={(itemValue) => setMode(itemValue)}
            style={{
              height: 50,
              color: "#f2e3b6",
            }}
          >
            <Picker.Item label="Agregar" value="add" />
            <Picker.Item label="Retirar" value="remove" />
          </Picker>
        </View>

        {/* Fecha (YYYY-MM-DD) */}
        <Text style={{ color: "#a59a7a", marginBottom: 6 }}>Fecha (YYYY-MM-DD)</Text>
        <TextInput
          value={date}
          onChangeText={setDate}
          style={{
            borderWidth: 1,
            padding: 12,
            borderColor: "#3b2f16",
            backgroundColor: "#0b0b0c",
            borderRadius: 8,
            color: "#f2e3b6",
            marginBottom: 18,
          }}
        />

        {/* Monto (COP) */}
        <Text style={{ color: "#a59a7a", marginBottom: 6 }}>Monto (COP)</Text>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          style={{
            borderWidth: 1,
            padding: 12,
            borderColor: "#3b2f16",
            backgroundColor: "#0b0b0c",
            borderRadius: 8,
            color: "#f2e3b6",
            marginBottom: 18,
          }}
        />

        {/* Cuenta (ID, opcional) con Picker */}
        <Text style={{ color: "#a59a7a", marginBottom: 6 }}>Cuenta (ID, opcional)</Text>
        <View
          style={{
            borderWidth: 1,
            borderColor: "#3b2f16",
            backgroundColor: "#0b0b0c",
            borderRadius: 8,
            marginBottom: 18,
            overflow: "hidden",  // Asegura que el Picker no sobresalga de los bordes redondeados
          }}
        >
          <Picker
            selectedValue={accountId}
            onValueChange={(itemValue) => setAccountId(itemValue)}
            style={{
              height: 50,
              color: "#f2e3b6",
            }}
          >
            {accounts.map((account) => (
              <Picker.Item key={account.id} label={account.name} value={String(account.id)} />
            ))}
          </Picker>
        </View>

        <Text style={{ color: "#a59a7a", marginBottom: 12 }}>
          Cuentas: {accounts.map((a) => `${a.id}:${a.name}`).join(" · ")}
        </Text>

        {/* Botón para agregar o retirar */}
        <ERButton
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

      <Text style={{ paddingHorizontal: 14, paddingTop: 6, fontSize: 16, fontWeight: "800", color: "#f2e3b6" }}>
        Historial
      </Text>
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
