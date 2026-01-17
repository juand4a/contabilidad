import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Alert ,TextInput} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker"; // Importamos Picker

import { todayISO, monthKey } from "../utils/dates";
import { listCategories, listBudgets, upsertBudget, expensesByCategory } from "../db/queries";
import { formatCOP, parseCOP } from "../utils/money";

import Row from "../components/Row";
import Card from "../components/Card";
import ERButton from "../components/ERButton";

function BudgetBar({ pct }) {
  const p = Math.max(0, Math.min(1.2, Number(pct || 0))); // permitimos pasarse un poco para mostrar overflow
  const width = `${Math.min(100, Math.round(p * 100))}%`;

  // Colores “soulslike”: normal dorado, warning más intenso (sin colores chillones)
  const fill = p >= 1 ? "#d6b15a" : p >= 0.8 ? "#caa85a" : "#8f7a3b";

  return (
    <View
      style={{
        height: 10,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: "#3b2f16",
        backgroundColor: "#141114",
        overflow: "hidden",
        marginTop: 8,
      }}
    >
      <View style={{ width, height: "100%", backgroundColor: fill }} />
    </View>
  );
}

export default function BudgetsScreen() {
  const month = monthKey(todayISO());

  const [cats, setCats] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [spentByCat, setSpentByCat] = useState({});

  const [catId, setCatId] = useState("");
  const [amount, setAmount] = useState("");
  const [rollover, setRollover] = useState("0");

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

  async function load() {
    const c = await listCategories("expense");
    setCats(c);

    const b = await listBudgets(month);
    setBudgets(b);

    const spent = await expensesByCategory(month);
    const map = {};
    for (const s of spent) map[s.category] = s.total;
    setSpentByCat(map);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#070708" }}>
      <View style={{ padding: 16, paddingTop: 18,marginTop:30 }}>
        <Text style={{ color: "#a59a7a", letterSpacing: 2, fontWeight: "700" }}>VOWS OF SPENDING</Text>
        <Text style={{ color: "#f2e3b6", fontSize: 22, fontWeight: "900", marginTop: 10 }}>
          Presupuesto
        </Text>
        <Text style={{ color: "#8f866c", marginTop: 6 }}>Mes: {month}</Text>
      </View>

      <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
        {/* FORM */}
        <Card
          title="Establecer presupuesto"
          subtitle="Define un límite por categoría"
          right={<Ionicons name="pie-chart" size={18} color="#caa85a" />}
        >
          <View style={{ gap: 10 }}>
            <View>
              <Text style={labelStyle}>Categoría</Text>
              <View
                style={{
                  borderWidth: 1,
                  borderColor: "#3b2f16",
                  backgroundColor: "#0b0b0c",
                  borderRadius: 8,
                  marginBottom: 18,
                  overflow: "hidden",
                }}
              >
                <Picker
                  selectedValue={catId}
                  onValueChange={(itemValue) => setCatId(itemValue)}
                  style={{
                    height: 50,
                    color: "#f2e3b6",
                  }}
                >
                  {cats.map((category) => (
                    <Picker.Item key={category.id} label={category.name} value={String(category.id)} />
                  ))}
                </Picker>
              </View>
              <Text style={hintStyle}>Categorías: {cats.map((c) => `${c.id}:${c.name}`).join(" · ")}</Text>
            </View>

            <View>
              <Text style={labelStyle}>Monto (COP)</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#6f6754"
                style={inputStyle}
              />
            </View>

            <View>
              <Text style={labelStyle}>Rollover (0/1)</Text>
              <Text style={{ color: "#8f866c", marginTop: -2 }}>
                Si activas la opción, lo no gastado se transferirá al siguiente mes.
              </Text>
              <View
                style={{
                  borderWidth: 1,
                  borderColor: "#3b2f16",
                  backgroundColor: "#0b0b0c",
                  borderRadius: 8,
                  marginBottom: 18,
                  overflow: "hidden",
                }}
              >
                <Picker
                  selectedValue={rollover}
                  onValueChange={(itemValue) => setRollover(itemValue)}
                  style={{
                    height: 50,
                    color: "#f2e3b6",
                  }}
                >
                  <Picker.Item label="No transferir al siguiente mes" value="0" />
                  <Picker.Item label="Transferir al siguiente mes" value="1" />
                </Picker>
              </View>
            </View>

            <ERButton
              title="Guardar presupuesto"
              onPress={async () => {
                const a = parseCOP(amount);
                const c = Number(catId);
                if (!a || !c) return Alert.alert("Datos inválidos");

                await upsertBudget({ month, categoryId: c, amount: a, rollover: rollover === "1" });

                setCatId("");
                setAmount("");
                await load();
              }}
            />

            <ERButton title="Actualizar" variant="secondary" onPress={load} />
          </View>
        </Card>

        {/* LIST */}
        <Card
          title="Tus presupuestos"
          subtitle={budgets.length ? "Progreso por categoría" : "Aún no has creado presupuestos"}
          right={<Ionicons name="list" size={18} color="#caa85a" />}
        >
          {budgets.length === 0 ? (
            <Text style={{ color: "#a59a7a" }}>
              Crea un presupuesto para ver alertas cuando alcances 80% o 100%.
            </Text>
          ) : (
            <View style={{ borderWidth: 1, borderColor: "#3b2f16", borderRadius: 14, overflow: "hidden" }}>
              {budgets.map((b) => {
                const spent = spentByCat[b.category_name] || 0;
                const pct = b.amount ? spent / b.amount : 0;
                const flag = pct >= 1 ? "🚨" : pct >= 0.8 ? "⚠️" : "✓";

                return (
                  <View key={b.id} style={{ backgroundColor: "#0b0b0c" }}>
                    <Row
                      title={`${flag} ${b.category_name}`}
                      subtitle={`Gastado: ${formatCOP(spent)} / Presupuesto: ${formatCOP(b.amount)} (${Math.round(pct * 100)}%)`}
                      right={"›"}
                      iconLeft={<Ionicons name="pricetag" size={16} color="#caa85a" />}
                    />
                    <View style={{ paddingHorizontal: 14, paddingBottom: 12 }}>
                      <BudgetBar pct={pct} />
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </Card>
      </View>
    </ScrollView>
  );
}
