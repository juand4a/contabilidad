import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Image, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { run } from "../db/db";
import { formatCOP } from "../utils/money";

export default function TransactionDetailScreen({ route, navigation }) {
  const { transactionId } = route.params;
  const [transaction, setTransaction] = useState(null);

  async function loadTransaction() {
    const r = await run(
      `SELECT t.*, a.name as account_name, c.name as category_name
       FROM transactions t
       JOIN accounts a ON a.id=t.account_id
       LEFT JOIN categories c ON c.id=t.category_id
       WHERE t.id=?`,
      [transactionId]
    );
    setTransaction(r.rows.item(0)); // Si existe la transacción, la guarda
  }

  useEffect(() => {
    loadTransaction();
  }, [transactionId]);

  if (!transaction) return <Text>Cargando...</Text>;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#070708" }}>
      <View style={{ padding: 16 }}>
        <Text style={{ color: "#f2e3b6", fontSize: 22, fontWeight: "900" }}>
          Detalles de la transacción
        </Text>

        <View style={{ marginTop: 16 }}>
          <Text style={{ color: "#a59a7a" }}>Fecha: {transaction.date}</Text>
          <Text style={{ color: "#a59a7a" }}>Tipo: {transaction.type}</Text>
          <Text style={{ color: "#a59a7a" }}>Cuenta: {transaction.account_name}</Text>
          <Text style={{ color: "#a59a7a" }}>
            Categoría: {transaction.category_name || "Sin categoría"}
          </Text>
          <Text style={{ color: "#a59a7a" }}>
            Monto: {formatCOP(transaction.amount)}
          </Text>
          <Text style={{ color: "#a59a7a" }}>
            Nota: {transaction.note || "Sin nota"}
          </Text>

          {/* Mostrar la foto adjunta si existe */}
          {transaction.attachment_uri ? (
            <View style={{ marginTop: 20 }}>
              <Text style={{ color: "#f2e3b6", fontWeight: "900" }}>Foto adjunta:</Text>
              <Image
                source={{ uri: transaction.attachment_uri }}
                style={{
                  width: "100%",
                  height: 220,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: "#3b2f16",
                  marginTop: 10,
                }}
              />
            </View>
          ) : null}
        </View>

        <View style={{ marginTop: 20 }}>
          <Ionicons name="arrow-back" size={24} color="#f2e3b6" onPress={() => navigation.goBack()} />
        </View>
      </View>
    </ScrollView>
  );
}
