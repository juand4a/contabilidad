import React, { useState } from "react";
import { View, Text, TextInput, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import Card from "../components/Card";
import ERButton from "../components/ERButton";

import { createAccount } from "../db/queries";
import { todayISO } from "../utils/dates";
import { parseCOP } from "../utils/money";

export default function AddAccountScreen({ navigation }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("bank");
  const [initial, setInitial] = useState("0");
  const [date, setDate] = useState(todayISO());

  const inputStyle = {
    borderWidth: 1,
    borderColor: "#3b2f16",
    backgroundColor: "#0b0b0c",
    color: "#f2e3b6",
    padding: 12,
    borderRadius: 12,
  };

  const labelStyle = { color: "#a59a7a", fontWeight: "800", letterSpacing: 1 };

  return (
    <View style={{ flex: 1, backgroundColor: "#070708", padding: 16 }}>
      <Text style={{ color: "#a59a7a", letterSpacing: 2, fontWeight: "700" }}>FORGE A NEW ACCOUNT</Text>

      <Card
        title="Detalles"
        subtitle="Nombre, tipo y saldo inicial"
        right={<Ionicons name="shield-half" size={18} color="#caa85a" />}
      >
        <View style={{ gap: 10 }}>
          <Text style={labelStyle}>Nombre</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Bancolombia Ahorros"
            placeholderTextColor="#6f6754"
            style={inputStyle}
          />

          <Text style={labelStyle}>Tipo</Text>
          <Text style={{ color: "#8f866c", marginTop: -6 }}>
            bank / cash / wallet / investment
          </Text>
          <TextInput
            value={type}
            onChangeText={setType}
            placeholder="bank"
            placeholderTextColor="#6f6754"
            style={inputStyle}
          />

          <Text style={labelStyle}>Saldo inicial (COP)</Text>
          <TextInput
            value={initial}
            onChangeText={setInitial}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor="#6f6754"
            style={inputStyle}
          />

          <Text style={labelStyle}>Fecha saldo inicial (YYYY-MM-DD)</Text>
          <TextInput
            value={date}
            onChangeText={setDate}
            placeholder="2026-01-16"
            placeholderTextColor="#6f6754"
            style={inputStyle}
          />

          <ERButton
            title="Guardar"
            onPress={async () => {
              if (!name.trim()) return Alert.alert("Falta nombre");
              await createAccount({
                name: name.trim(),
                type: type.trim(),
                initialBalance: parseCOP(initial),
                initialDate: date,
              });
              navigation.goBack();
            }}
          />

          <ERButton title="Cancelar" variant="secondary" onPress={() => navigation.goBack()} />
        </View>
      </Card>
    </View>
  );
}
