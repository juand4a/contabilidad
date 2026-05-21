import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, TextInput, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";

import Row from "../components/Row";
import Card from "../components/Card";
import ERButton from "../components/ERButton";

import { parseCOP, formatCOP } from "../utils/money";
import { run } from "../db/db";
import { listAccounts, listCategories } from "../db/queries";
import { initNotifications, scheduleRecurringReminder, syncUpcomingNotifications, cancelReminder } from "../utils/notifications";

export default function RecurringScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [catsExpense, setCatsExpense] = useState([]);
  const [catsIncome, setCatsIncome] = useState([]);

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [day, setDay] = useState("5");
  const [type, setType] = useState("expense");
  const [reminderDays, setReminderDays] = useState("1");

  const cats = useMemo(() => (type === "income" ? catsIncome : catsExpense), [type, catsIncome, catsExpense]);

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
       ORDER BY r.active DESC, r.next_date ASC, r.id DESC`
    );
    setItems(r.rows._array || []);
  }

  useEffect(() => {
    (async () => {
      const acc = await listAccounts();
      setAccounts(acc);
      if (!accountId && acc[0]) setAccountId(String(acc[0].id));

      setCatsExpense(await listCategories("expense"));
      setCatsIncome(await listCategories("income"));

      try {
        await initNotifications();
        await syncUpcomingNotifications(45);
      } catch (e) {
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
    return t === "income" ? "arrow-down" : "card";
  }

  async function toggleActive(item) {
    const nextActive = item.active ? 0 : 1;
    if (!nextActive && item.notification_id) {
      await cancelReminder(item.notification_id);
    }

    await run(
      `UPDATE recurring
       SET active=?, notification_id=?
       WHERE id=?`,
      [nextActive, nextActive ? item.notification_id : null, item.id]
    );
    await load();
  }

  async function rescheduleAll() {
    try {
      const current = await run(`SELECT notification_id FROM recurring WHERE active=1 AND notification_id IS NOT NULL AND notification_id!=''`);
      for (const item of current.rows._array || []) {
        await cancelReminder(item.notification_id);
      }
      await run(`UPDATE recurring SET notification_id=NULL WHERE active=1`);
      const result = await syncUpcomingNotifications(45);
      await load();
      Alert.alert("Listo", `Alertas revisadas. Programadas: ${result.scheduled}.`);
    } catch (e) {
      Alert.alert("Error", "No se pudieron reprogramar las alertas.");
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#070708" }}>
      <View style={{ padding: 16, paddingTop: 18 }}>
        <Text style={{ color: "#a59a7a", letterSpacing: 2, fontWeight: "700" }}>OATHS OF RECURRING</Text>
        <Text style={{ color: "#f2e3b6", fontSize: 22, fontWeight: "900", marginTop: 10 }}>
          Membresías y suscripciones
        </Text>
        <Text style={{ color: "#8f866c", marginTop: 6 }}>
          Controla pagos recurrentes y recibe alertas antes del vencimiento.
        </Text>
      </View>

      <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
        <Card
          title="Crear membresía"
          subtitle="Nombre, valor, fecha de pago y recordatorio"
          right={<Ionicons name="notifications" size={18} color="#caa85a" />}
        >
          <View style={{ gap: 10 }}>
            <View>
              <Text style={labelStyle}>Nombre</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Netflix, Spotify, Gimnasio..."
                placeholderTextColor="#6f6754"
                style={inputStyle}
              />
            </View>

            <View>
              <Text style={labelStyle}>Tipo</Text>
              <View style={{ borderWidth: 1, borderColor: "#3b2f16", backgroundColor: "#0b0b0c", borderRadius: 8, marginBottom: 18, overflow: "hidden" }}>
                <Picker selectedValue={type} onValueChange={(v) => { setType(v); setCategoryId(""); }} style={{ height: 50, color: "#f2e3b6" }}>
                  <Picker.Item label="Gasto / pago" value="expense" />
                  <Picker.Item label="Ingreso recurrente" value="income" />
                </Picker>
              </View>
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
              <Text style={labelStyle}>Cuenta</Text>
              <View style={{ borderWidth: 1, borderColor: "#3b2f16", backgroundColor: "#0b0b0c", borderRadius: 8, marginBottom: 18, overflow: "hidden" }}>
                <Picker selectedValue={accountId} onValueChange={setAccountId} style={{ height: 50, color: "#f2e3b6" }}>
                  {accounts.map((account) => (
                    <Picker.Item key={account.id} label={`${account.name} · ${account.type}`} value={String(account.id)} />
                  ))}
                </Picker>
              </View>
              <Text style={hintStyle}>También puedes seleccionar la cuenta “Efectivo”.</Text>
            </View>

            <View>
              <Text style={labelStyle}>Categoría (opcional)</Text>
              <View style={{ borderWidth: 1, borderColor: "#3b2f16", backgroundColor: "#0b0b0c", borderRadius: 8, marginBottom: 18, overflow: "hidden" }}>
                <Picker selectedValue={categoryId} onValueChange={setCategoryId} style={{ height: 50, color: "#f2e3b6" }}>
                  <Picker.Item label="Sin categoría" value="" />
                  {cats.map((cat) => (
                    <Picker.Item key={cat.id} label={cat.name} value={String(cat.id)} />
                  ))}
                </Picker>
              </View>
            </View>

            <View>
              <Text style={labelStyle}>Día de pago del mes</Text>
              <TextInput
                value={day}
                onChangeText={setDay}
                placeholder="5"
                placeholderTextColor="#6f6754"
                keyboardType="numeric"
                style={inputStyle}
              />
            </View>

            <View>
              <Text style={labelStyle}>Avisar cuántos días antes</Text>
              <TextInput
                value={reminderDays}
                onChangeText={setReminderDays}
                placeholder="1"
                placeholderTextColor="#6f6754"
                keyboardType="numeric"
                style={inputStyle}
              />
              <Text style={hintStyle}>Ejemplo: si vence el 10 y colocas 2, avisa el día 8.</Text>
            </View>

            <ERButton
              title="Crear con alerta"
              onPress={async () => {
                if (!name.trim()) return Alert.alert("Falta nombre");

                const a = parseCOP(amount);
                const acc = Number(accountId);
                const cat = categoryId ? Number(categoryId) : null;
                const d = Number(day);
                const days = Math.max(0, Number(reminderDays || 0));

                if (!a || !acc || !d) return Alert.alert("Datos inválidos");
                if (type.trim() !== "expense" && type.trim() !== "income") {
                  return Alert.alert("Tipo inválido", "Usa: expense o income");
                }
                if (d < 1 || d > 31) return Alert.alert("Día inválido", "Usa 1-31");

                const next = calcNextDate(d);
                const nextISO = next.toISOString().slice(0, 10);

                const res = await run(
                  `INSERT INTO recurring(name,type,amount,account_id,category_id,day_of_month,next_date,active,reminder_days_before)
                   VALUES (?,?,?,?,?,?,?,1,?)`,
                  [name.trim(), type.trim(), a, acc, cat, d, nextISO, days]
                );

                try {
                  const item = {
                    id: res.insertId,
                    name: name.trim(),
                    amount: a,
                    next_date: nextISO,
                    reminder_days_before: days,
                  };
                  const notificationId = await scheduleRecurringReminder(item);
                  if (notificationId) await run(`UPDATE recurring SET notification_id=? WHERE id=?`, [notificationId, res.insertId]);
                } catch (e) {
                  console.log("Reminder warn:", e);
                }

                setName("");
                setAmount("");
                setCategoryId("");
                await load();
                Alert.alert("Listo", "Membresía creada con recordatorio.");
              }}
            />

            <ERButton title="Reprogramar alertas" variant="secondary" onPress={rescheduleAll} />
          </View>
        </Card>

        <Card
          title="Tus membresías"
          subtitle={items.length ? "Activas primero y próximas a vencer" : "Aún no has creado membresías"}
          right={<Ionicons name="list" size={18} color="#caa85a" />}
        >
          {items.length === 0 ? (
            <Text style={{ color: "#a59a7a" }}>
              Crea una membresía para tener recordatorios de pagos sin conexión.
            </Text>
          ) : (
            <View style={{ borderWidth: 1, borderColor: "#3b2f16", borderRadius: 14, overflow: "hidden" }}>
              {items.map((r) => (
                <Row
                  key={r.id}
                  title={`${r.active ? "✓" : "⏸"} ${r.name}`}
                  subtitle={`${r.type === "income" ? "Ingreso" : "Pago"} · ${formatCOP(r.amount)} · ${r.account_name}${r.category_name ? " · " + r.category_name : ""} · Próximo: ${r.next_date} · Avisa ${r.reminder_days_before ?? 1} día(s) antes`}
                  right={r.notification_id ? "🔔" : "›"}
                  iconLeft={<Ionicons name={typeIcon(r.type)} size={16} color="#caa85a" />}
                  onPress={() => toggleActive(r)}
                />
              ))}
            </View>
          )}
        </Card>
      </View>
    </ScrollView>
  );
}
