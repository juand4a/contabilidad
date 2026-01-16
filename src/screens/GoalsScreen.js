import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TextInput, Button, Alert } from "react-native";
import Row from "../components/Row";
import { run } from "../db/db";
import { formatCOP, parseCOP } from "../utils/money";
import { goalBalance } from "../db/queries";

export default function GoalsScreen({ navigation }) {
  const [items, setItems] = useState([]);

  const [name, setName] = useState("");
  const [target, setTarget] = useState("");

  async function load() {
    const r = await run(`SELECT * FROM goals ORDER BY id DESC`);
    const goals = r.rows._array || [];
    const enriched = [];
    for (const g of goals) {
      const saved = await goalBalance(g.id);
      enriched.push({ ...g, saved_amount_calc: saved });
    }
    setItems(enriched);
  }

  useEffect(() => {
    const unsub = navigation?.addListener?.("focus", load);
    load();
    return unsub;
  }, [navigation]);

  return (
    <ScrollView style={{ flex: 1 }}>
      <View style={{ padding: 14, gap: 8 }}>
        <Text style={{ fontSize: 18, fontWeight: "900" }}>Ahorros (Metas)</Text>

        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Fondo de emergencia"
          style={{ borderWidth: 1, padding: 10 }}
        />
        <TextInput
          value={target}
          onChangeText={setTarget}
          placeholder="Meta COP"
          keyboardType="numeric"
          style={{ borderWidth: 1, padding: 10 }}
        />

        <Button
          title="Crear meta"
          onPress={async () => {
            if (!name.trim()) return Alert.alert("Falta nombre");
            const t = parseCOP(target);
            if (!t) return Alert.alert("Meta inválida");

            await run(`INSERT INTO goals(name, target_amount) VALUES (?,?)`, [name.trim(), t]);
            setName(""); setTarget("");
            await load();
          }}
        />
      </View>

      {items.map((g) => {
        const saved = g.saved_amount_calc || 0;
        const pct = g.target_amount ? saved / g.target_amount : 0;
        return (
          <Row
            key={g.id}
            title={g.name}
            subtitle={`Ahorrado: ${formatCOP(saved)} / ${formatCOP(g.target_amount)} (${Math.round(pct * 100)}%)`}
            onPress={() => navigation.navigate("GoalDetail", { goalId: g.id })}
          />
        );
      })}
    </ScrollView>
  );
}
