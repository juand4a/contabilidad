import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import Row from "../components/Row";
import Card from "../components/Card";
import ERButton from "../components/ERButton";

import { formatCOP } from "../utils/money";
import { monthKey, todayISO } from "../utils/dates";
import { syncUpcomingNotifications } from "../utils/notifications";
import {
  monthSummary,
  listLoans,
  loanBalance,
  netWorth,
  listGoals,
  goalBalance,
  getLiquiditySummary,
  upcomingAlerts,
  ensureDefaultCashAccount,
} from "../db/queries";

function ProgressBar({ value }) {
  const pct = Math.max(0, Math.min(1, Number(value || 0)));
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
      <View style={{ width: `${Math.round(pct * 100)}%`, height: "100%", backgroundColor: "#caa85a" }} />
    </View>
  );
}

function RuneFAB({ onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        position: "absolute",
        right: 18,
        bottom: Platform.OS === "ios" ? 26 : 18,
        width: 66,
        height: 66,
        borderRadius: 33,
        backgroundColor: "#0b0b0c",
        borderWidth: 1,
        borderColor: "#caa85a",
        justifyContent: "center",
        alignItems: "center",
        opacity: pressed ? 0.88 : 1,
        shadowColor: "#caa85a",
        shadowOpacity: 0.18,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 8 },
        elevation: 8,
      })}
    >
      <View
        style={{
          width: 58,
          height: 58,
          borderRadius: 29,
          borderWidth: 1,
          borderColor: "#3b2f16",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#070708",
        }}
      >
        <Ionicons name="disc" size={24} color="#caa85a" style={{ textShadowColor: "#caa85a", textShadowRadius: 8 }} />
        <Ionicons name="sparkles" size={14} color="#f2e3b6" style={{ position: "absolute", top: 12, right: 12, opacity: 0.9 }} />
        <Ionicons name="add" size={18} color="#f2e3b6" style={{ position: "absolute", bottom: 12, left: 12, opacity: 0.9 }} />
      </View>
    </Pressable>
  );
}

function dueLabel(daysLeft) {
  if (daysLeft < 0) return `Vencido hace ${Math.abs(daysLeft)} día(s)`;
  if (daysLeft === 0) return "Vence hoy";
  if (daysLeft === 1) return "Vence mañana";
  return `Vence en ${daysLeft} día(s)`;
}

export default function DashboardScreen({ navigation }) {
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState({ income: 0, expense: 0, savings: 0 });
  const [nextDebtItems, setNextDebtItems] = useState([]);
  const [worth, setWorth] = useState({ totalCash: 0, receivable: 0, payable: 0, net: 0 });
  const [goals, setGoals] = useState([]);
  const [liquidity, setLiquidity] = useState({ cash: 0, bank: 0, wallet: 0, investment: 0, total: 0 });
  const [alerts, setAlerts] = useState([]);

  const month = useMemo(() => monthKey(todayISO()), []);

  async function load() {
    await ensureDefaultCashAccount();

    const liquiditySummary = await getLiquiditySummary();
    setLiquidity(liquiditySummary);
    setTotal(liquiditySummary.total);

    setSummary(await monthSummary(month));

    const loans = await listLoans();
    const open = [];
    for (const l of loans) {
      if (l.status !== "open") continue;
      const b = await loanBalance(l.id);
      open.push({ ...l, remaining: b.remaining });
    }
    open.sort((a, b) => {
      if (a.next_due_date && b.next_due_date) return String(a.next_due_date).localeCompare(String(b.next_due_date));
      return b.remaining - a.remaining;
    });
    setNextDebtItems(open.slice(0, 5));

    setWorth(await netWorth());

    const rawGoals = await listGoals();
    const enrichedGoals = [];
    for (const g of rawGoals) {
      const currentSaved = await goalBalance(g.id);
      enrichedGoals.push({ ...g, saved_amount: currentSaved });
    }
    setGoals(enrichedGoals);

    setAlerts(await upcomingAlerts(7));

    try {
      await syncUpcomingNotifications(45);
    } catch (e) {
      console.log("Notification sync warn:", e);
    }
  }

  useEffect(() => {
    const unsub = navigation.addListener("focus", load);
    load();
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation]);

  return (
    <View style={{ flex: 1, backgroundColor: "#070708" }}>
      <ScrollView style={{ flex: 1 }}>
        <View style={{ padding: 16, paddingTop: 24, marginTop: 30 }}>
          <Text style={{ color: "#a59a7a", letterSpacing: 2, fontWeight: "700" }}>
            LEDGER OF THE TARNISHED
          </Text>

          <Text style={{ color: "#f2e3b6", fontSize: 30, fontWeight: "900", marginTop: 10 }}>
            {formatCOP(total)}
          </Text>

          <Text style={{ color: "#8f866c", marginTop: 6 }}>Saldo total · efectivo + cuentas · {month}</Text>

          <View style={{ marginTop: 14, flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <ERButton title="Ahorros" onPress={() => navigation.navigate("Goals")} />
            </View>
            <View style={{ flex: 1 }}>
              <ERButton title="Membresías" variant="secondary" onPress={() => navigation.navigate("Recurring")} />
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, paddingBottom: 90 }}>
          <Card title="Dinero disponible" subtitle="Separado por efectivo, bancos y billeteras" right={formatCOP(liquidity.total)}>
            <View style={{ gap: 6 }}>
              <Text style={{ color: "#d9cfac" }}>Efectivo: <Text style={{ color: "#f2e3b6", fontWeight: "900" }}>{formatCOP(liquidity.cash)}</Text></Text>
              <Text style={{ color: "#d9cfac" }}>Bancos: <Text style={{ color: "#f2e3b6", fontWeight: "900" }}>{formatCOP(liquidity.bank)}</Text></Text>
              <Text style={{ color: "#d9cfac" }}>Billeteras: <Text style={{ color: "#f2e3b6", fontWeight: "900" }}>{formatCOP(liquidity.wallet)}</Text></Text>
              <Text style={{ color: "#d9cfac" }}>Inversiones: <Text style={{ color: "#f2e3b6", fontWeight: "900" }}>{formatCOP(liquidity.investment)}</Text></Text>
            </View>
          </Card>

          <Card title="Alertas próximas" subtitle="Membresías y cuotas que vencen en 7 días" right={<Ionicons name="notifications" size={18} color="#caa85a" />}>
            {alerts.length === 0 ? (
              <Text style={{ color: "#a59a7a" }}>No tienes vencimientos próximos.</Text>
            ) : (
              <View style={{ borderWidth: 1, borderColor: "#3b2f16", borderRadius: 14, overflow: "hidden" }}>
                {alerts.slice(0, 6).map((item) => (
                  <Row
                    key={`${item.kind}_${item.id}`}
                    title={`${item.title} · ${formatCOP(item.amount)}`}
                    subtitle={`${dueLabel(item.daysLeft)} · ${item.dueDate} · ${item.subtitle}`}
                    right="🔔"
                    iconLeft={<Ionicons name={item.kind === "recurring" ? "card" : "calendar"} size={16} color="#caa85a" />}
                    onPress={() => {
                      if (item.kind === "loan_installment") navigation.navigate("LoanDetail", { loanId: item.loanId });
                      else navigation.navigate("Recurring");
                    }}
                  />
                ))}
              </View>
            )}
          </Card>

          <Card title="Este mes" subtitle="Ingresos, gastos y ahorro neto">
            <View style={{ gap: 6 }}>
              <Text style={{ color: "#d9cfac" }}>Ingresos: <Text style={{ color: "#f2e3b6", fontWeight: "900" }}>{formatCOP(summary.income)}</Text></Text>
              <Text style={{ color: "#d9cfac" }}>Gastos: <Text style={{ color: "#f2e3b6", fontWeight: "900" }}>{formatCOP(summary.expense)}</Text></Text>
              <Text style={{ color: "#d9cfac" }}>Ahorro: <Text style={{ color: "#f2e3b6", fontWeight: "900" }}>{formatCOP(summary.savings)}</Text></Text>
            </View>
          </Card>

          <Card title="Patrimonio" subtitle="Activos líquidos + por cobrar - por pagar" right={formatCOP(worth.net)}>
            <View style={{ gap: 6 }}>
              <Text style={{ color: "#d9cfac" }}>Activos líquidos: <Text style={{ color: "#f2e3b6", fontWeight: "900" }}>{formatCOP(worth.totalCash)}</Text></Text>
              <Text style={{ color: "#d9cfac" }}>Por cobrar: <Text style={{ color: "#f2e3b6", fontWeight: "900" }}>{formatCOP(worth.receivable)}</Text></Text>
              <Text style={{ color: "#d9cfac" }}>Por pagar: <Text style={{ color: "#f2e3b6", fontWeight: "900" }}>{formatCOP(worth.payable)}</Text></Text>
            </View>
          </Card>

          <Card title="Metas de ahorro" subtitle={goals.length ? "Forja tu progreso" : "Aún no has creado metas"}>
            {goals.length === 0 ? (
              <View style={{ gap: 10 }}>
                <Text style={{ color: "#a59a7a" }}>Crea una meta para ver el progreso aquí.</Text>
                <ERButton title="Crear meta" onPress={() => navigation.navigate("Goals")} />
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {goals.map((g) => {
                  const saved = g.saved_amount || 0;
                  const target = g.target_amount || 0;
                  const pct = target ? saved / target : 0;

                  return (
                    <View key={g.id} style={{ paddingVertical: 6 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                        <Text style={{ color: "#f2e3b6", fontWeight: "900", flex: 1 }}>{g.name}</Text>
                        <Text style={{ color: "#a59a7a" }}>{Math.round(pct * 100)}%</Text>
                      </View>
                      <Text style={{ color: "#8f866c", marginTop: 4 }}>
                        {formatCOP(saved)} / {formatCOP(target)}
                      </Text>
                      <ProgressBar value={pct} />
                    </View>
                  );
                })}
                <ERButton title="Ver todas" variant="secondary" onPress={() => navigation.navigate("Goals")} />
              </View>
            )}
          </Card>

          <Text style={{ color: "#e7d7a5", fontSize: 14, letterSpacing: 1, fontWeight: "800", marginBottom: 10 }}>
            DEUDAS / PRÉSTAMOS ABIERTOS
          </Text>

          <View style={{ borderWidth: 1, borderColor: "#3b2f16", borderRadius: 14, overflow: "hidden" }}>
            {nextDebtItems.length === 0 ? (
              <View style={{ padding: 14, backgroundColor: "#0b0b0c" }}>
                <Text style={{ color: "#a59a7a" }}>No tienes préstamos abiertos.</Text>
              </View>
            ) : (
              nextDebtItems.map((l) => (
                <Row
                  key={l.id}
                  title={`${l.direction === "i_owe" ? "Debo" : "Me deben"}: ${l.person}`}
                  subtitle={`Pendiente: ${formatCOP(l.remaining)}${l.next_due_date ? " · Próxima cuota: " + l.next_due_date : ""}`}
                  right={l.next_due_date ? "🔔" : "›"}
                  onPress={() => navigation.navigate("LoanDetail", { loanId: l.id })}
                />
              ))
            )}
          </View>
          <View style={{ height: 18 }} />
        </View>
      </ScrollView>

      <RuneFAB onPress={() => navigation.navigate("AddTransaction")} />
    </View>
  );
}
