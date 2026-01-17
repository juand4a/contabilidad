import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TextInput, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";  // Importamos Picker

import Row from "../components/Row";
import Card from "../components/Card";
import ERButton from "../components/ERButton";

import { formatCOP, parseCOP } from "../utils/money";
import { todayISO } from "../utils/dates";
import { listLoans, loanBalance, createLoan, listAccounts } from "../db/queries";

export default function LoansScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [showNew, setShowNew] = useState(false);

  const [direction, setDirection] = useState("i_owe");
  const [person, setPerson] = useState("");
  const [principal, setPrincipal] = useState("");
  const [accountId, setAccountId] = useState("");
  const [accounts, setAccounts] = useState([]);

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

  function loanIcon(dir) {
    return dir === "i_owe" ? "skull" : "hand-left";
  }

  async function load() {
    const acc = await listAccounts();
    setAccounts(acc);
    if (!accountId && acc[0]) setAccountId(String(acc[0].id));

    const loans = await listLoans();
    const enriched = [];
    for (const l of loans) {
      const b = await loanBalance(l.id);
      enriched.push({ ...l, remaining: b.remaining });
    }
    // orden: abiertos primero y mayor pendiente arriba
    enriched.sort((a, b) => {
      if (a.status !== b.status) return a.status === "open" ? -1 : 1;
      return (b.remaining || 0) - (a.remaining || 0);
    });
    setItems(enriched);
  }

  useEffect(() => {
    const unsub = navigation.addListener("focus", load);
    load();
    return unsub;
  }, [navigation]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#070708" }}>
      <View style={{ padding: 16, paddingTop: 18, marginTop: 30 }}>
        <Text style={{ color: "#a59a7a", letterSpacing: 2, fontWeight: "700" }}>BOOK OF DEBTS</Text>
        <Text style={{ color: "#f2e3b6", fontSize: 22, fontWeight: "900", marginTop: 10 }}>
          Deudas y Préstamos
        </Text>
        <Text style={{ color: "#8f866c", marginTop: 6 }}>
          Controla lo que debes y lo que te deben.
        </Text>

        <View style={{ marginTop: 14 }}>
          <ERButton
            title={showNew ? "Cerrar" : "Nuevo préstamo"}
            variant={showNew ? "secondary" : "primary"}
            onPress={() => setShowNew(!showNew)}
          />
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
        {showNew ? (
          <Card
            title="Forjar préstamo"
            subtitle="Crea un registro nuevo"
            right={<Ionicons name="sparkles" size={18} color="#caa85a" />}
          >
            <View style={{ gap: 10 }}>
              {/* Dirección */}
              <View>
                <Text style={labelStyle}>Dirección</Text>
                <Text style={{ color: "#8f866c", marginTop: -2 }}>
                  debo / me deben
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
                    selectedValue={direction}
                    onValueChange={(itemValue) => setDirection(itemValue)}
                    style={{
                      height: 50,
                      color: "#f2e3b6",
                    }}
                  >
                    <Picker.Item label="Debo" value="i_owe" />
                    <Picker.Item label="Me deben" value="owed_to_me" />
                  </Picker>
                </View>
              </View>

              {/* Persona */}
              <View>
                <Text style={labelStyle}>Persona</Text>
                <TextInput
                  value={person}
                  onChangeText={setPerson}
                  placeholder="Nombre"
                  placeholderTextColor="#6f6754"
                  style={inputStyle}
                />
              </View>

              {/* Principal */}
              <View>
                <Text style={labelStyle}>Principal (COP)</Text>
                <TextInput
                  value={principal}
                  onChangeText={setPrincipal}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#6f6754"
                  style={inputStyle}
                />
              </View>

              {/* Cuenta */}
              <View>
                <Text style={labelStyle}>Cuenta (ID) desde la que sale/entra</Text>
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
                    selectedValue={accountId}
                    onValueChange={(itemValue) => setAccountId(itemValue)}
                    style={{
                      height: 50,
                      color: "#f2e3b6",
                    }}
                  >
                    {accounts.map((account) => (
                      <Picker.Item key={account.id} label={account.name} value={String(account.id)} />
                    ))}
                  </Picker>
                </View>
                <Text style={hintStyle}>
                  Cuentas: {accounts.map((a) => `${a.id}:${a.name}`).join(" · ")}
                </Text>
              </View>

              {/* Crear préstamo */}
              <ERButton
                title="Crear"
                onPress={async () => {
                  if (!person.trim()) return Alert.alert("Falta persona");
                  const p = parseCOP(principal);
                  if (!p) return Alert.alert("Principal inválido");
                  if (!accountId) return Alert.alert("Cuenta requerida");

                  const dir = direction.trim();
                  if (dir !== "i_owe" && dir !== "owed_to_me") {
                    return Alert.alert("Dirección inválida", "Usa: i_owe o owed_to_me");
                  }

                  try {
                    await createLoan({
                      direction: dir,
                      person: person.trim(),
                      principal: p,
                      interest_rate: 0,
                      start_date: todayISO(),
                      note: null,
                      accountId: Number(accountId),
                    });
                    Alert.alert("Éxito", "Préstamo creado correctamente.");
                    setShowNew(false);
                    setPerson("");
                    setPrincipal("");
                    await load();
                  } catch (error) {
                    Alert.alert("Error", "No se pudo crear el préstamo.");
                  }
                }}
              />
            </View>
          </Card>
        ) : null}

        <Card
          title="Registros"
          subtitle={items.length ? "Préstamos abiertos y cerrados" : "Aún no hay préstamos"}
          right={<Ionicons name="book" size={18} color="#caa85a" />}
        >
          {items.length === 0 ? (
            <Text style={{ color: "#a59a7a" }}>
              Crea un préstamo para registrar deudas o dinero prestado.
            </Text>
          ) : (
            <View style={{ borderWidth: 1, borderColor: "#3b2f16", borderRadius: 14, overflow: "hidden" }}>
              {items.map((l) => {
                const label = l.direction === "i_owe" ? "Debo" : "Me deben";
                const statusFlag = l.status === "closed" ? "⏸" : "✓";
                return (
                  <Row
                    key={l.id}
                    title={`${statusFlag} ${label}: ${l.person}`}
                    subtitle={`Pendiente: ${formatCOP(l.remaining)} · Principal: ${formatCOP(l.principal)}`}
                    right={"›"}
                    iconLeft={<Ionicons name={loanIcon(l.direction)} size={16} color="#caa85a" />}
                    onPress={() => navigation.navigate("LoanDetail", { loanId: l.id })}
                  />
                );
              })}
            </View>
          )}
        </Card>
      </View>
    </ScrollView>
  );
}
