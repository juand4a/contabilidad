import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Alert, TextInput, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import Card from "../components/Card";
import ERButton from "../components/ERButton";

import { run } from "../db/db";
import { toCSV } from "../utils/csv";

import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";

import { shareBackup, restoreBackupFromUri } from "../utils/backup";
import { setLockEnabled, isLockEnabled } from "../utils/auth";

function Pill({ icon, label, value }) {
  return (
    <View
      style={{
        flex: 1,
        borderWidth: 1,
        borderColor: "#3b2f16",
        borderRadius: 14,
        backgroundColor: "#0b0b0c",
        padding: 12,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: "#3b2f16",
            backgroundColor: "#070708",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name={icon} size={16} color="#caa85a" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#a59a7a", fontSize: 12, letterSpacing: 1, fontWeight: "800" }}>
            {label.toUpperCase()}
          </Text>
          <Text style={{ color: "#f2e3b6", fontSize: 18, fontWeight: "900", marginTop: 2 }}>
            {value}
          </Text>
        </View>
      </View>
    </View>
  );
}

function ToggleRow({ title, subtitle, value, onToggle }) {
  return (
    <Pressable
      onPress={onToggle}
      style={({ pressed }) => ({
        borderWidth: 1,
        borderColor: value ? "#caa85a" : "#3b2f16",
        borderRadius: 14,
        backgroundColor: "#0b0b0c",
        padding: 14,
        opacity: pressed ? 0.9 : 1,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#f2e3b6", fontWeight: "900", letterSpacing: 0.4 }}>{title}</Text>
          {subtitle ? <Text style={{ color: "#8f866c", marginTop: 6 }}>{subtitle}</Text> : null}
        </View>

        {/* toggle visual */}
        <View
          style={{
            width: 52,
            height: 30,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: value ? "#caa85a" : "#3b2f16",
            backgroundColor: value ? "#141114" : "#070708",
            padding: 3,
            justifyContent: "center",
          }}
        >
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: value ? "#caa85a" : "#a59a7a",
              alignSelf: value ? "flex-end" : "flex-start",
            }}
          />
        </View>
      </View>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const [lock, setLock] = useState(false);

  const [newCat, setNewCat] = useState("");
  const [newCatKind, setNewCatKind] = useState("expense");

  const [newTag, setNewTag] = useState("");

  const [counts, setCounts] = useState({
    accounts: 0,
    categories: 0,
    tags: 0,
    transactions: 0,
    loans: 0,
  });

  const inputStyle = {
    borderWidth: 1,
    borderColor: "#3b2f16",
    backgroundColor: "#0b0b0c",
    color: "#f2e3b6",
    padding: 12,
    borderRadius: 12,
  };

  const labelStyle = { color: "#a59a7a", fontWeight: "800", letterSpacing: 1, marginBottom: 6 };

  useEffect(() => {
    (async () => {
      setLock(await isLockEnabled());
      await refreshCounts();
    })();
  }, []);

  async function refreshCounts() {
    const q = async (table) => {
      const r = await run(`SELECT COUNT(*) as c FROM ${table}`);
      return r.rows.item(0)?.c ?? 0;
    };

    setCounts({
      accounts: await q("accounts"),
      categories: await q("categories"),
      tags: await q("tags"),
      transactions: await q("transactions"),
      loans: await q("loans"),
    });
  }

  async function exportTransactionsCSV() {
    const r = await run(
      `SELECT t.id, t.date, t.type, t.amount,
              a.name as account,
              c.name as category,
              t.note,
              t.attachment_uri,
              t.transfer_group,
              t.related_id
       FROM transactions t
       JOIN accounts a ON a.id=t.account_id
       LEFT JOIN categories c ON c.id=t.category_id
       ORDER BY t.date DESC, t.id DESC`
    );

    const rows = r.rows._array || [];
    const csv = toCSV(rows, [
      "id",
      "date",
      "type",
      "amount",
      "account",
      "category",
      "note",
      "attachment_uri",
      "transfer_group",
      "related_id",
    ]);

    const uri = FileSystem.documentDirectory + `transacciones_${Date.now()}.csv`;
    await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });
    await Sharing.shareAsync(uri);
  }

  async function restoreBackup() {
    const picked = await DocumentPicker.getDocumentAsync({
      type: ["application/json", "text/json", "text/plain"],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (picked.canceled) return;

    const asset = picked.assets?.[0];
    if (!asset?.uri) return Alert.alert("Error", "No se pudo leer el archivo seleccionado.");

    try {
      await restoreBackupFromUri(asset.uri);
      await refreshCounts();
      Alert.alert("Listo", "Backup restaurado correctamente.");
    } catch (e) {
      Alert.alert("Error al restaurar", String(e?.message || e));
    }
  }

  async function addCategory() {
    const name = newCat.trim();
    const kind = newCatKind.trim();

    if (!name) return Alert.alert("Falta nombre");
    if (kind !== "expense" && kind !== "income") return Alert.alert("Tipo inválido", "Usa: expense o income");

    await run(`INSERT INTO categories(name, parent_id, kind) VALUES (?,?,?)`, [name, null, kind]);
    setNewCat("");
    await refreshCounts();
    Alert.alert("Creada", `Categoría "${name}" (${kind})`);
  }

  async function addTag() {
    const name = newTag.trim().toLowerCase();
    if (!name) return Alert.alert("Falta etiqueta");

    await run(`INSERT OR IGNORE INTO tags(name) VALUES (?)`, [name]);
    setNewTag("");
    await refreshCounts();
    Alert.alert("Listo", `Etiqueta "${name}" guardada.`);
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#070708" }}>
      {/* HEADER */}
      <View style={{ padding: 16, paddingTop: 18 }}>
        <Text style={{ color: "#a59a7a", letterSpacing: 2, fontWeight: "700" }}>RITES & SETTINGS</Text>
        <Text style={{ color: "#f2e3b6", fontSize: 22, fontWeight: "900", marginTop: 10 }}>Ajustes</Text>
        <Text style={{ color: "#8f866c", marginTop: 6 }}>
          Seguridad, catálogos y respaldo del ledger.
        </Text>

        <View style={{ marginTop: 14, height: 1, backgroundColor: "#2a2112" }} />
      </View>

      <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 12 }}>
        {/* STATS GRID */}
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pill icon="wallet" label="Cuentas" value={counts.accounts} />
          <Pill icon="list" label="Movimientos" value={counts.transactions} />
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pill icon="layers" label="Categorías" value={counts.categories} />
          <Pill icon="pricetags" label="Etiquetas" value={counts.tags} />
        </View>

        <Card
          title="Estado"
          subtitle="Recalcula conteos (útil después de restore)"
          right={<Ionicons name="refresh" size={18} color="#caa85a" />}
        >
          <ERButton title="Actualizar conteos" variant="secondary" onPress={refreshCounts} />
        </Card>

        {/* SECURITY */}
        <Card
          title="Seguridad"
          subtitle="Bloqueo biométrico al abrir"
          right={<Ionicons name="lock-closed" size={18} color="#caa85a" />}
        >
          <ToggleRow
            title={lock ? "Bloqueo activado" : "Bloqueo desactivado"}
            subtitle="Usa biometría (o método alterno del sistema)."
            value={lock}
            onToggle={async () => {
              const next = !lock;
              await setLockEnabled(next);
              setLock(next);
              Alert.alert("Listo", next ? "Bloqueo activado." : "Bloqueo desactivado.");
            }}
          />
        </Card>

        {/* CATEGORIES */}
        <Card
          title="Categorías"
          subtitle="Crea categorías para clasificar"
          right={<Ionicons name="layers" size={18} color="#caa85a" />}
        >
          <View style={{ gap: 10 }}>
            <View>
              <Text style={labelStyle}>Nombre</Text>
              <TextInput
                value={newCat}
                onChangeText={setNewCat}
                placeholder="Mascotas"
                placeholderTextColor="#6f6754"
                style={inputStyle}
              />
            </View>

            <View>
              <Text style={labelStyle}>Tipo</Text>
              <Text style={{ color: "#8f866c", marginTop: -2 }}>expense / income</Text>
              <TextInput
                value={newCatKind}
                onChangeText={setNewCatKind}
                placeholder="expense"
                placeholderTextColor="#6f6754"
                style={inputStyle}
              />
            </View>

            <ERButton title="Agregar categoría" onPress={addCategory} />
          </View>
        </Card>

        {/* TAGS */}
        <Card
          title="Etiquetas"
          subtitle="Tags para filtrar y buscar"
          right={<Ionicons name="pricetag" size={18} color="#caa85a" />}
        >
          <View style={{ gap: 10 }}>
            <View>
              <Text style={labelStyle}>Etiqueta</Text>
              <TextInput
                value={newTag}
                onChangeText={setNewTag}
                placeholder="mercado"
                placeholderTextColor="#6f6754"
                style={inputStyle}
              />
            </View>

            <ERButton title="Agregar etiqueta" onPress={addTag} />
          </View>
        </Card>

        {/* BACKUP / EXPORT */}
        <Card
          title="Respaldo"
          subtitle="Exporta o restaura tu progreso"
          right={<Ionicons name="cloud-upload" size={18} color="#caa85a" />}
        >
          <View style={{ gap: 10 }}>
            <ERButton title="Exportar CSV (transacciones)" variant="secondary" onPress={exportTransactionsCSV} />
            <ERButton title="Backup JSON — Compartir" onPress={shareBackup} />

            {/* Zona de riesgo (más “dramática”) */}
            <View
              style={{
                marginTop: 6,
                borderWidth: 1,
                borderColor: "#6a4b20",
                backgroundColor: "#0b0b0c",
                borderRadius: 14,
                padding: 12,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Ionicons name="warning" size={18} color="#caa85a" />
                <Text style={{ color: "#f2e3b6", fontWeight: "900" }}>Zona de riesgo</Text>
              </View>
              <Text style={{ color: "#8f866c", marginTop: 8 }}>
                Restaurar reemplaza todos tus datos actuales.
              </Text>

              <View style={{ marginTop: 10 }}>
                <ERButton
                  title="Restore JSON — Restaurar"
                  variant="secondary"
                  onPress={() => {
                    Alert.alert(
                      "Restaurar backup",
                      "Esto reemplazará tus datos actuales. ¿Continuar?",
                      [
                        { text: "Cancelar", style: "cancel" },
                        { text: "Restaurar", style: "destructive", onPress: restoreBackup },
                      ]
                    );
                  }}
                />
              </View>
            </View>
          </View>
        </Card>
      </View>
    </ScrollView>
  );
}
