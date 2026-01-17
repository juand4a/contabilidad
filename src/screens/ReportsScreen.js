import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { todayISO, monthKey } from "../utils/dates";
import { monthSummary, expensesByCategory } from "../db/queries";
import { formatCOP } from "../utils/money";

import Row from "../components/Row";
import Card from "../components/Card";

function Bar({ pct }) {
  const p = Math.max(0, Math.min(1, Number(pct || 0)));
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
      <View style={{ width: `${Math.round(p * 100)}%`, height: "100%", backgroundColor: "#caa85a" }} />
    </View>
  );
}

export default function ReportsScreen() {
  const month = useMemo(() => monthKey(todayISO()), []);
  const [sum, setSum] = useState({ income: 0, expense: 0, savings: 0 });
  const [byCat, setByCat] = useState([]);

  useEffect(() => {
    (async () => {
      setSum(await monthSummary(month));
      setByCat(await expensesByCategory(month));
    })();
  }, [month]);

  const totalExpense = byCat.reduce((s, r) => s + (r.total || 0), 0);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#070708" }}>
      <View style={{ padding: 16, paddingTop: 18,marginTop:30 }}>
        <Text style={{ color: "#a59a7a", letterSpacing: 2, fontWeight: "700" }}>SCROLL OF INSIGHT</Text>
        <Text style={{ color: "#f2e3b6", fontSize: 22, fontWeight: "900", marginTop: 10 }}>
          Reporte
        </Text>
        <Text style={{ color: "#8f866c", marginTop: 6 }}>Mes: {month}</Text>
      </View>

      <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
        {/* SUMMARY */}
        <Card
          title="Resumen"
          subtitle="Ingresos, gastos y ahorro neto"
          right={<Ionicons name="bar-chart" size={18} color="#caa85a" />}
        >
          <View style={{ gap: 6 }}>
            <Text style={{ color: "#d9cfac" }}>
              Ingresos:{" "}
              <Text style={{ color: "#f2e3b6", fontWeight: "900" }}>{formatCOP(sum.income)}</Text>
            </Text>
            <Text style={{ color: "#d9cfac" }}>
              Gastos:{" "}
              <Text style={{ color: "#f2e3b6", fontWeight: "900" }}>{formatCOP(sum.expense)}</Text>
            </Text>
            <Text style={{ color: "#d9cfac" }}>
              Ahorro:{" "}
              <Text style={{ color: "#f2e3b6", fontWeight: "900" }}>{formatCOP(sum.savings)}</Text>
            </Text>
          </View>
        </Card>

        {/* EXPENSES BY CATEGORY */}
        <Card
          title="Gastos por categoría"
          subtitle={byCat.length ? `Total gastos: ${formatCOP(totalExpense)}` : "Sin gastos registrados"}
          right={<Ionicons name="pricetag" size={18} color="#caa85a" />}
        >
          {byCat.length === 0 ? (
            <Text style={{ color: "#a59a7a" }}>
              Cuando registres gastos, verás la distribución por categoría aquí.
            </Text>
          ) : (
            <View style={{ borderWidth: 1, borderColor: "#3b2f16", borderRadius: 14, overflow: "hidden" }}>
              {byCat.map((r) => {
                const pct = totalExpense ? r.total / totalExpense : 0;
                return (
                  <View key={r.category} style={{ backgroundColor: "#0b0b0c" }}>
                    <Row
                      title={r.category}
                      right={formatCOP(r.total)}
                      subtitle={`${Math.round(pct * 100)}% del gasto`}
                      iconLeft={<Ionicons name="caret-forward" size={16} color="#caa85a" />}
                    />
                    <View style={{ paddingHorizontal: 14, paddingBottom: 12 }}>
                      <Bar pct={pct} />
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
