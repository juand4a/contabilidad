import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, Alert, ScrollView, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import Card from "../components/Card";
import ERButton from "../components/ERButton";

import { todayISO } from "../utils/dates";
import { parseCOP } from "../utils/money";
import { listAccounts, listCategories, addTransaction, addTransfer } from "../db/queries";

export default function AddTransactionScreen({ route, navigation }) {
  const presetAccountId = route.params?.accountId || null;

  const [date, setDate] = useState(todayISO());
  const [type, setType] = useState("expense"); // expense|income|transfer|adjustment
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [accountId, setAccountId] = useState(presetAccountId ? String(presetAccountId) : "");
  const [toAccountId, setToAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [tags, setTags] = useState("");
  const [attachmentUri, setAttachmentUri] = useState(null);

  // split
  const [useSplit, setUseSplit] = useState(false);
  const [split1Cat, setSplit1Cat] = useState("");
  const [split1Amt, setSplit1Amt] = useState("");
  const [split2Cat, setSplit2Cat] = useState("");
  const [split2Amt, setSplit2Amt] = useState("");

  const [accounts, setAccounts] = useState([]);
  const [catsExpense, setCatsExpense] = useState([]);
  const [catsIncome, setCatsIncome] = useState([]);

  const categories = useMemo(
    () => (type === "income" ? catsIncome : catsExpense),
    [type, catsIncome, catsExpense]
  );

  useEffect(() => {
    (async () => {
      const acc = await listAccounts();
      setAccounts(acc);

      const exp = await listCategories("expense");
      const inc = await listCategories("income");
      setCatsExpense(exp);
      setCatsIncome(inc);

      if (!accountId && acc[0]) setAccountId(String(acc[0].id));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  async function pickImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert("Permiso requerido", "Necesitas permitir acceso a fotos.");
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (!res.canceled) setAttachmentUri(res.assets[0].uri);
  }

  function typeLabel(t) {
    switch (t) {
      case "expense":
        return "GASTO";
      case "income":
        return "INGRESO";
      case "transfer":
        return "TRANSFERENCIA";
      case "adjustment":
        return "AJUSTE";
      default:
        return String(t || "").toUpperCase();
    }
  }

  function typeIcon(t) {
    if (t === "income") return "arrow-down";
    if (t === "expense") return "arrow-up";
    if (t === "transfer") return "swap-horizontal";
    if (t === "adjustment") return "build";
    return "ellipse";
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#070708" }}>
      <View style={{ padding: 16, paddingTop: 18 }}>
        <Text style={{ color: "#a59a7a", letterSpacing: 2, fontWeight: "700" }}>SCRIBE A NEW ENTRY</Text>
        <Text style={{ color: "#f2e3b6", fontSize: 22, fontWeight: "900", marginTop: 10 }}>
          {typeLabel(type)}
        </Text>
        <Text style={{ color: "#8f866c", marginTop: 6 }}>
          Registra el movimiento en tu ledger (offline).
        </Text>
      </View>

      <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
        {/* DATOS PRINCIPALES */}
        <Card
          title="Datos"
          subtitle="Fecha, tipo y monto"
          right={<Ionicons name={typeIcon(type)} size={18} color="#caa85a" />}
        >
          <View style={{ gap: 10 }}>
            <View>
              <Text style={labelStyle}>Fecha (YYYY-MM-DD)</Text>
              <TextInput
                value={date}
                onChangeText={setDate}
                placeholder="2026-01-16"
                placeholderTextColor="#6f6754"
                style={inputStyle}
              />
            </View>

            <View>
              <Text style={labelStyle}>Tipo</Text>
              <Text style={{ color: "#8f866c", marginTop: -2 }}>
                expense / income / transfer / adjustment
              </Text>
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
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#6f6754"
                style={inputStyle}
              />
            </View>
          </View>
        </Card>

        {/* CUENTAS */}
        <Card title="Cuenta" subtitle="Origen (y destino si es transferencia)" right={<Ionicons name="wallet" size={18} color="#caa85a" />}>
          <View style={{ gap: 10 }}>
            <View>
              <Text style={labelStyle}>Cuenta (ID)</Text>
              <TextInput
                value={accountId}
                onChangeText={setAccountId}
                keyboardType="numeric"
                placeholder="1"
                placeholderTextColor="#6f6754"
                style={inputStyle}
              />
              <Text style={hintStyle}>
                Cuentas: {accounts.map((a) => `${a.id}:${a.name}`).join(" · ")}
              </Text>
            </View>

            {type === "transfer" ? (
              <View>
                <Text style={labelStyle}>Cuenta destino (ID)</Text>
                <TextInput
                  value={toAccountId}
                  onChangeText={setToAccountId}
                  keyboardType="numeric"
                  placeholder="2"
                  placeholderTextColor="#6f6754"
                  style={inputStyle}
                />
              </View>
            ) : null}
          </View>
        </Card>

        {/* CATEGORÍAS + SPLIT (NO aplica a transfer) */}
        {type !== "transfer" ? (
          <Card
            title="Clasificación"
            subtitle="Categoría, split y etiquetas"
            right={<Ionicons name="pricetag" size={18} color="#caa85a" />}
          >
            <View style={{ gap: 10 }}>
              <View>
                <Text style={labelStyle}>Categoría (ID)</Text>
                <TextInput
                  value={categoryId}
                  onChangeText={setCategoryId}
                  keyboardType="numeric"
                  placeholder="3"
                  placeholderTextColor="#6f6754"
                  style={inputStyle}
                />
                <Text style={hintStyle}>
                  Categorías: {categories.map((c) => `${c.id}:${c.name}`).join(" · ")}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setUseSplit(!useSplit)}
                activeOpacity={0.85}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: useSplit ? "#caa85a" : "#3b2f16",
                  backgroundColor: "#0b0b0c",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <Ionicons name={useSplit ? "checkbox" : "square-outline"} size={18} color="#caa85a" />
                <Text style={{ color: "#f2e3b6", fontWeight: "900", letterSpacing: 1 }}>
                  {useSplit ? "SPLIT ACTIVADO" : "ACTIVAR SPLIT (DIVIDIR)"}
                </Text>
              </TouchableOpacity>

              {useSplit ? (
                <View style={{ gap: 10 }}>
                  <Text style={{ color: "#8f866c" }}>
                    Split ignora la categoría principal y reparte el monto.
                  </Text>

                  <View>
                    <Text style={labelStyle}>Split 1 (catId)</Text>
                    <TextInput
                      value={split1Cat}
                      onChangeText={setSplit1Cat}
                      keyboardType="numeric"
                      placeholder="catId"
                      placeholderTextColor="#6f6754"
                      style={inputStyle}
                    />
                    <Text style={[labelStyle, { marginTop: 10 }]}>Split 1 (monto)</Text>
                    <TextInput
                      value={split1Amt}
                      onChangeText={setSplit1Amt}
                      keyboardType="numeric"
                      placeholder="monto"
                      placeholderTextColor="#6f6754"
                      style={inputStyle}
                    />
                  </View>

                  <View>
                    <Text style={labelStyle}>Split 2 (opcional catId)</Text>
                    <TextInput
                      value={split2Cat}
                      onChangeText={setSplit2Cat}
                      keyboardType="numeric"
                      placeholder="catId"
                      placeholderTextColor="#6f6754"
                      style={inputStyle}
                    />
                    <Text style={[labelStyle, { marginTop: 10 }]}>Split 2 (opcional monto)</Text>
                    <TextInput
                      value={split2Amt}
                      onChangeText={setSplit2Amt}
                      keyboardType="numeric"
                      placeholder="monto"
                      placeholderTextColor="#6f6754"
                      style={inputStyle}
                    />
                  </View>
                </View>
              ) : null}

              <View>
                <Text style={labelStyle}>Etiquetas (separadas por coma)</Text>
                <TextInput
                  value={tags}
                  onChangeText={setTags}
                  placeholder="mercado, almuerzo"
                  placeholderTextColor="#6f6754"
                  style={inputStyle}
                />
              </View>
            </View>
          </Card>
        ) : null}

        {/* NOTA + ADJUNTO */}
        <Card title="Detalles" subtitle="Nota y adjunto (opcional)" right={<Ionicons name="document-text" size={18} color="#caa85a" />}>
          <View style={{ gap: 10 }}>
            <View>
              <Text style={labelStyle}>Nota</Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Descripción breve"
                placeholderTextColor="#6f6754"
                style={inputStyle}
              />
            </View>

            <ERButton title={attachmentUri ? "Cambiar foto" : "Adjuntar foto"} variant="secondary" onPress={pickImage} />

            {attachmentUri ? (
              <View style={{ marginTop: 10 }}>
                <Image
                  source={{ uri: attachmentUri }}
                  style={{
                    width: "100%",
                    height: 220,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: "#3b2f16",
                  }}
                />
              </View>
            ) : null}
          </View>
        </Card>

        {/* ACCIONES */}
        <Card title="Rito" subtitle="Guardar o cancelar" right={<Ionicons name="sparkles" size={18} color="#caa85a" />}>
          <View style={{ gap: 10 }}>
            <ERButton
              title="Guardar"
              onPress={async () => {
                const amt = parseCOP(amount);
                if (!amt) return Alert.alert("Monto inválido");
                if (!accountId) return Alert.alert("Selecciona cuenta");

                // Transferencia
                if (type === "transfer") {
                  if (!toAccountId) return Alert.alert("Falta cuenta destino");
                  if (String(toAccountId) === String(accountId))
                    return Alert.alert("Destino no puede ser igual al origen");

                  await addTransfer({
                    date,
                    amount: amt,
                    fromAccountId: Number(accountId),
                    toAccountId: Number(toAccountId),
                    note: note || null,
                  });

                  navigation.goBack();
                  return;
                }

                const tagNames = tags
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean);

                let splits = [];
                if (useSplit) {
                  const s1a = parseCOP(split1Amt);
                  const s1c = Number(split1Cat);
                  if (!s1a || !s1c) return Alert.alert("Split 1 inválido");
                  splits.push({ categoryId: s1c, amount: s1a });

                  if (split2Cat && split2Amt) {
                    const s2a = parseCOP(split2Amt);
                    const s2c = Number(split2Cat);
                    if (s2a && s2c) splits.push({ categoryId: s2c, amount: s2a });
                  }

                  const sum = splits.reduce((acc, s) => acc + s.amount, 0);
                  if (sum !== amt)
                    return Alert.alert("Split no cuadra", "La suma de splits debe ser igual al monto total.");
                }

                await addTransaction({
                  date,
                  type,
                  amount: amt,
                  accountId: Number(accountId),
                  categoryId: useSplit ? null : categoryId ? Number(categoryId) : null,
                  note,
                  attachmentUri,
                  tagNames,
                  splits,
                });

                navigation.goBack();
              }}
            />

            <ERButton title="Cancelar" variant="secondary" onPress={() => navigation.goBack()} />
          </View>
        </Card>
      </View>
    </ScrollView>
  );
}
