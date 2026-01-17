import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import Row from "../components/Row";
import Card from "../components/Card";
import ERButton from "../components/ERButton";

import { run } from "../db/db";
import { formatCOP } from "../utils/money";

export default function TransactionsScreen({ navigation }) {
  const [txs, setTxs] = useState([]);

  const icons = useMemo(
    () => ({
      income: "arrow-down",
      expense: "arrow-up",
      transfer: "swap-horizontal",
      adjustment: "build",
      loan: "receipt",
    }),
    []
  );

  function txIcon(type, amount) {
    if (type === "transfer") return amount < 0 ? "arrow-back" : "arrow-forward";
    return icons[type] || "ellipse";
  }

  function typeLabel(type) {
    switch (type) {
      case "income":
        return "INGRESO";
      case "expense":
        return "GASTO";
      case "transfer":
        return "TRANSFER";
      case "adjustment":
        return "AJUSTE";
      case "loan":
        return "PRÉSTAMO";
      default:
        return String(type || "").toUpperCase();
    }
  }

  async function load() {
    const r = await run(
      `SELECT t.*, a.name as account_name, c.name as category_name
       FROM transactions t
       JOIN accounts a ON a.id=t.account_id
       LEFT JOIN categories c ON c.id=t.category_id
       ORDER BY date DESC, id DESC
       LIMIT 200`
    );
    setTxs(r.rows._array || []);
  }

  useEffect(() => {
    const unsub = navigation.addListener("focus", load);
    load();
    return unsub;
  }, [navigation]);

  // mini resumen (solo para mostrar arriba; no es contable perfecto, pero útil)
  const lastCount = txs.length;
  const lastTotal = txs.slice(0, 20).reduce((s, t) => s + (t.amount || 0), 0);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#070708" }}>
      {/* HEADER */}
      <View style={{ padding: 16, paddingTop: 18,marginTop:30 }}>
        <Text style={{ color: "#a59a7a", letterSpacing: 2, fontWeight: "700" }}>CHRONICLE OF RUNES</Text>
        <Text style={{ color: "#f2e3b6", fontSize: 22, fontWeight: "900", marginTop: 10 }}>
          Movimientos
        </Text>
        <Text style={{ color: "#8f866c", marginTop: 6 }}>
          Últimos {Math.min(200, lastCount)} registros · Vista rápida (20): {formatCOP(lastTotal)}
        </Text>

        <View style={{ marginTop: 14 }}>
          <ERButton title="Nuevo movimiento" onPress={() => navigation.navigate("AddTransaction")} />
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
        <Card
          title="Historial"
          subtitle={txs.length ? "Ordenado por fecha (desc)" : "Aún no hay movimientos"}
          right={<Ionicons name="time" size={18} color="#caa85a" />}
        >
          {txs.length === 0 ? (
            <Text style={{ color: "#a59a7a" }}>
              Crea tu primer movimiento para que el ledger empiece a registrar tu historia.
            </Text>
          ) : (
            <View style={{ borderWidth: 1, borderColor: "#3b2f16", borderRadius: 14, overflow: "hidden" }}>
              {txs.map((t) => (
                <Row
                  key={t.id}
                  title={`${typeLabel(t.type)} · ${formatCOP(t.amount)}`}
                  subtitle={`${t.date} · ${t.account_name}${t.category_name ? " · " + t.category_name : " · Sin categoría"}${t.note ? " · " + t.note : " · Sin nota"}`}
                  iconLeft={<Ionicons name={txIcon(t.type, t.amount)} size={16} color="#caa85a" />}
                  onPress={() => navigation.navigate("TransactionDetail", { transactionId: t.id })}
                />
              ))}
            </View>
          )}
        </Card>
      </View>
    </ScrollView>
  );
}
