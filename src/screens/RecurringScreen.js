import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TextInput, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import Row from "../components/Row";
import Card from "../components/Card";
import ERButton from "../components/ERButton";

import { parseCOP, formatCOP } from "../utils/money";
import { run } from "../db/db";
import { listAccounts, listCategories } from "../db/queries";
import { initNotifications, scheduleReminder } from "../utils/notifications";

export default function RecurringScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [cats, setCats] = useState([]);

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [day, setDay] = useState("5"); // day of month
  const [type, setType] = useState("expense");

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
    const r = await run(
      `SELECT r.*, a.name as account_name, c.name as category_name
       FROM recurring r
       JOIN accounts a ON a.id=r.account_id
       LEFT JOIN categories c ON c.id=r.category_id
       ORDER BY r.active DESC, r.id DESC`
    );
    setItems(r.rows._array || []);
  }

  useEffect(() => {
    (async () => {
      const acc = await listAccounts();
      setAccounts(acc);
      if (!accountId && acc[0]) setAccountId(String(acc[0].id));

      setCats(await listCategories("expense"));

      // Importante: en Expo Go Android puede tener limitaciones
      try {
        await initNotifications();
      } catch (e) {
        // no rompemos la app
        console.log("Notifications init warn:", e);
      }

      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function calcNextDate(d) {
    const today = new Date();
    const next = new Date(today.getFullYear(), today.getMonth(), d, 9, 0, 0);
    if (next < today) next.setMonth(next.getMonth() + 1);
    return next;
  }

  function typeIcon(t) {
    return t === "income" ? "arrow-down" : "arrow-up";
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#070708" }}>
      <View style={{ padding: 16, paddingTop: 18 }}>
        <Text style={{ color: "#a59a7a", letterSpacing: 2, fontWeight: "700" }}>OATHS OF RECURRING</Text>
        <Text style={{ color: "#f2e3b6", fontSize: 22, fontWeight: "900", marginTop: 10 }}>
          Suscripciones
        </Text>
        <Text style={{ color: "#8f866c", marginTop: 6 }}>
          Crea recordatorios para pagos recurrentes (local).
        </Text>
      </View>

      <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
        {/* FORM */}
        <Card
          title="Crear recurrente"
          subtitle="Nombre, monto y próximo pago"
          right={<Ionicons name="repeat" size={18} color="#caa85a" />}
        >
          <View style={{ gap: 10 }}>
            <View>
              <Text style={labelStyle}>Nombre</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Netflix"
                placeholderTextColor="#6f6754"
                style={inputStyle}
              />
            </View>

            <View>
              <Text style={labelStyle}>Tipo</Text>
              <Text style={{ color: "#8f866c", marginTop: -2 }}>expense / income</Text>
              <TextInput
                value={type}
                onChangeText={setType}
                placeholder="expense"
                placeholderTextColor="#6f6754"
                style={inputStyle}
              />
            </View>

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

            <View>
              <Text style={labelStyle}>Categoría (ID)</Text>
              <TextInput
                value={categoryId}
                onChangeText={setCategoryId}
                placeholder="(opcional)"
                placeholderTextColor="#6f6754"
                keyboardType="numeric"
                style={inputStyle}
              />
              <Text style={hintStyle}>
                Categorías: {cats.map((c) => `${c.id}:${c.name}`).join(" · ")}
              </Text>
            </View>

            <View>
              <Text style={labelStyle}>Día del mes</Text>
              <Text style={{ color: "#8f866c", marginTop: -2 }}>1-28/30/31 (según mes)</Text>
              <TextInput
                value={day}
                onChangeText={setDay}
                placeholder="5"
                placeholderTextColor="#6f6754"
                keyboardType="numeric"
                style={inputStyle}
              />
            </View>

            <ERButton
              title="Crear"
              onPress={async () => {
                if (!name.trim()) return Alert.alert("Falta nombre");

                const a = parseCOP(amount);
                const acc = Number(accountId);
                const cat = categoryId ? Number(categoryId) : null;
                const d = Number(day);

                if (!a || !acc || !d) return Alert.alert("Datos inválidos");
                if (type.trim() !== "expense" && type.trim() !== "income") {
                  return Alert.alert("Tipo inválido", "Usa: expense o income");
                }
                if (d < 1 || d > 31) return Alert.alert("Día inválido", "Usa 1-31");

                const next = calcNextDate(d);

                await run(
                  `INSERT INTO recurring(name,type,amount,account_id,category_id,day_of_month,next_date,active)
                   VALUES (?,?,?,?,?,?,?,1)`,
                  [name.trim(), type.trim(), a, acc, cat, d, next.toISOString().slice(0, 10)]
                );

                // recordatorio local (si falla no rompe)
                try {
                  await scheduleReminder("Pago recurrente", `${name.trim()} · ${formatCOP(a)}`, next);
                } catch (e) {
                  console.log("Reminder warn:", e);
                }

                setName("");
                setAmount("");
                setCategoryId("");
                await load();
              }}
            />

            <ERButton title="Actualizar" variant="secondary" onPress={load} />
          </View>
        </Card>

        {/* LIST */}
        <Card
          title="Tus recurrentes"
          subtitle={items.length ? "Activos primero" : "Aún no has creado recurrentes"}
          right={<Ionicons name="list" size={18} color="#caa85a" />}
        >
          {items.length === 0 ? (
            <Text style={{ color: "#a59a7a" }}>
              Crea un recurrente para tener recordatorios de pagos sin conexión.
            </Text>
          ) : (
            <View style={{ borderWidth: 1, borderColor: "#3b2f16", borderRadius: 14, overflow: "hidden" }}>
              {items.map((r) => (
                <Row
                  key={r.id}
                  title={`${r.active ? "✓" : "⏸"} ${r.name}`}
                  subtitle={`${r.type} · ${formatCOP(r.amount)} · ${r.account_name}${r.category_name ? " · " + r.category_name : ""} · Próximo: ${r.next_date}`}
                  iconLeft={<Ionicons name={typeIcon(r.type)} size={16} color="#caa85a" />}
                />
              ))}
            </View>
          )}
        </Card>
      </View>
    </ScrollView>
  );
}
