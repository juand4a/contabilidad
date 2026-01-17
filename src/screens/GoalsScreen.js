import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TextInput, Alert } from "react-native";
import Row from "../components/Row";
import ERButton from "../components/ERButton";  // Asumiendo que este componente es el que usas para botones
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
    <ScrollView style={{ flex: 1, backgroundColor: "#070708" }}>
      <View style={{ padding: 16, gap: 8 }}>
        <Text style={{ fontSize: 22, fontWeight: "900", color: "#f2e3b6" }}>Ahorros (Metas)</Text>

        {/* Nombre de la meta */}
        <Text style={{ color: "#a59a7a", marginBottom: 6 }}>Nombre de la meta</Text>
        <TextInput
          value={name}
          onChangeText={setName}
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

        {/* Meta COP */}
        <Text style={{ color: "#a59a7a", marginBottom: 6 }}>Meta COP</Text>
        <TextInput
          value={target}
          onChangeText={setTarget}
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

        {/* Botón para crear la meta */}
        <ERButton
          title="Crear meta"
          onPress={async () => {
            if (!name.trim()) return Alert.alert("Falta nombre");
            const t = parseCOP(target);
            if (!t) return Alert.alert("Meta inválida");

            await run(`INSERT INTO goals(name, target_amount) VALUES (?,?)`, [name.trim(), t]);
            setName("");
            setTarget("");
            await load();
          }}
        />
      </View>

      <View style={{ paddingHorizontal: 16, paddingBottom: 90 }}>
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
      </View>
    </ScrollView>
  );
}
