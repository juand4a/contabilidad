import React, { useEffect, useState } from "react";
import { View, ScrollView, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import Row from "../components/Row";
import Card from "../components/Card";
import ERButton from "../components/ERButton";

import { listAccounts, getAccountBalance } from "../db/queries";
import { formatCOP } from "../utils/money";

export default function AccountsScreen({ navigation }) {
  const [items, setItems] = useState([]);

  async function load() {
    const acc = await listAccounts();
    const enriched = [];
    for (const a of acc) {
      const bal = await getAccountBalance(a.id);
      enriched.push({ ...a, balance: bal });
    }
    setItems(enriched);
  }

  useEffect(() => {
    const unsub = navigation.addListener("focus", load);
    load();
    return unsub;
  }, [navigation]);

  const total = items.reduce((s, a) => s + (a.balance || 0), 0);

  const typeIcon = (type) => {
    switch (type) {
      case "bank":
        return "business";
      case "cash":
        return "cash";
      case "wallet":
        return "wallet";
      case "investment":
        return "trending-up";
      default:
        return "card";
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#070708" }}>
      <View style={{ padding: 16, paddingTop: 18,marginTop:30 }}>
        <Text style={{ color: "#a59a7a", letterSpacing: 2, fontWeight: "700" }}>HALL OF ACCOUNTS</Text>
        <Text style={{ color: "#f2e3b6", fontSize: 26, fontWeight: "900", marginTop: 10 }}>
          {formatCOP(total)}
        </Text>
        <Text style={{ color: "#8f866c", marginTop: 6 }}>Total en cuentas</Text>

        <View style={{ marginTop: 14 }}>
          <ERButton title="Crear cuenta" onPress={() => navigation.navigate("AddAccount")} />
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
        {items.length === 0 ? (
          <Card
            title="Sin cuentas"
            subtitle="Crea tu primera cuenta (banco/efectivo/billetera)"
            right={<Ionicons name="sparkles" size={18} color="#caa85a" />}
          >
            <Text style={{ color: "#a59a7a" }}>
              Consejo: crea una cuenta por cada lugar donde guardas dinero (banco, efectivo, billetera).
            </Text>
          </Card>
        ) : (
          <View style={{ borderWidth: 1, borderColor: "#3b2f16", borderRadius: 14, overflow: "hidden" }}>
            {items.map((a) => (
              <Row
                key={a.id}
                title={`${a.name}`}
                subtitle={`${a.type.toUpperCase()} · ${a.currency}`}
                right={formatCOP(a.balance)}
                onPress={() => navigation.navigate("AccountDetail", { accountId: a.id, title: a.name })}
                iconLeft={
                  <Ionicons name={typeIcon(a.type)} size={18} color="#caa85a" style={{ marginRight: 10 }} />
                }
              />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
