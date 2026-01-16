import React, { useEffect, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { getAccountBalance, listAccountTransactions } from "../db/queries";
import { formatCOP } from "../utils/money";

import Row from "../components/Row";
import Card from "../components/Card";
import ERButton from "../components/ERButton";

export default function AccountDetailScreen({ route, navigation }) {
  const { accountId } = route.params;

  const [balance, setBalance] = useState(0);
  const [txs, setTxs] = useState([]);

  async function load() {
    setBalance(await getAccountBalance(accountId));
    setTxs(await listAccountTransactions(accountId));
  }

  useEffect(() => {
    const unsub = navigation.addListener("focus", load);
    load();
    return unsub;
  }, [navigation]);

  const txIcon = (type, amt) => {
    if (type === "income") return "arrow-down";
    if (type === "expense") return "arrow-up";
    if (type === "transfer") return amt < 0 ? "arrow-back" : "arrow-forward";
    if (type === "adjustment") return "build";
    if (type === "loan") return "receipt";
    return "ellipse";
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#070708" }}>
      <View style={{ padding: 16, paddingTop: 18 }}>
        <Text style={{ color: "#a59a7a", letterSpacing: 2, fontWeight: "700" }}>ACCOUNT SIGIL</Text>

        <Text style={{ color: "#f2e3b6", fontSize: 28, fontWeight: "900", marginTop: 10 }}>
          {formatCOP(balance)}
        </Text>

        <Text style={{ color: "#8f866c", marginTop: 6 }}>Balance actual</Text>

        <View style={{ marginTop: 14 }}>
          <ERButton
            title="Nuevo movimiento"
            onPress={() => navigation.navigate("AddTransaction", { accountId })}
          />
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
        <Card
          title="Registro"
          subtitle={txs.length ? "Últimos movimientos" : "Aún no hay movimientos"}
          right={<Ionicons name="list" size={18} color="#caa85a" />}
        >
          {txs.length === 0 ? (
            <Text style={{ color: "#a59a7a" }}>
              Registra tu primer movimiento para ver el historial de esta cuenta.
            </Text>
          ) : (
            <View style={{ borderWidth: 1, borderColor: "#3b2f16", borderRadius: 14, overflow: "hidden" }}>
              {txs.map((t) => (
                <Row
                  key={t.id}
                  title={`${t.type.toUpperCase()} · ${formatCOP(t.amount)}`}
                  subtitle={`${t.date}${t.category_name ? " · " + t.category_name : ""}${t.note ? " · " + t.note : ""}`}
                  iconLeft={
                    <Ionicons
                      name={txIcon(t.type, t.amount)}
                      size={18}
                      color="#caa85a"
                      style={{ marginRight: 10 }}
                    />
                  }
                />
              ))}
            </View>
          )}
        </Card>
      </View>
    </ScrollView>
  );
}
