import React, { useEffect, useState } from "react";
import { ActivityIndicator, View, Text } from "react-native";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

import { initDb } from "./src/db/schema";
import { isLockEnabled, authenticate } from "./src/utils/auth";

import ERButton from "./src/components/ERButton";

import DashboardScreen from "./src/screens/DashboardScreen";
import AccountsScreen from "./src/screens/AccountsScreen";
import AccountDetailScreen from "./src/screens/AccountDetailScreen";
import AddAccountScreen from "./src/screens/AddAccountScreen";
import TransactionsScreen from "./src/screens/TransactionsScreen";
import AddTransactionScreen from "./src/screens/AddTransactionScreen";
import LoansScreen from "./src/screens/LoansScreen";
import LoanDetailScreen from "./src/screens/LoanDetailScreen";
import BudgetsScreen from "./src/screens/BudgetsScreen";
import ReportsScreen from "./src/screens/ReportsScreen";
import GoalsScreen from "./src/screens/GoalsScreen";
import RecurringScreen from "./src/screens/RecurringScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import GoalDetailScreen from "./src/screens/GoalDetailScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

/* =======================
   THEME
======================= */
const ER_NAV_THEME = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: "#070708",
    card: "#0b0b0c",
    text: "#f2e3b6",
    border: "#3b2f16",
    primary: "#caa85a",
  },
};

const stackScreenOptions = {
  headerStyle: { backgroundColor: "#0b0b0c" },
  headerTintColor: "#f2e3b6",
  headerTitleStyle: { fontWeight: "900", letterSpacing: 1 },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: "#070708" },
};

/* =======================
   TABS WITH ICONS
======================= */
function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,

        tabBarStyle: {
          backgroundColor: "#0b0b0c",
          borderTopColor: "#3b2f16",
          borderTopWidth: 1,
        },

        tabBarActiveTintColor: "#caa85a",
        tabBarInactiveTintColor: "#7d745c",

        tabBarLabelStyle: {
          fontWeight: "700",
          letterSpacing: 0.5,
          fontSize: 11,
        },

        tabBarIcon: ({ color, size, focused }) => {
          let iconName;

          switch (route.name) {
            case "Inicio":
              iconName = focused ? "flame" : "flame-outline";
              break;
            case "Cuentas":
              iconName = focused ? "wallet" : "wallet-outline";
              break;
            case "Movimientos":
              iconName = focused ? "swap-vertical" : "swap-vertical-outline";
              break;
            case "Deudas":
              iconName = focused ? "alert-circle" : "alert-circle-outline";
              break;
            case "Presupuesto":
              iconName = focused ? "pie-chart" : "pie-chart-outline";
              break;
            case "Reportes":
              iconName = focused ? "bar-chart" : "bar-chart-outline";
              break;
            case "Ajustes":
              iconName = focused ? "settings" : "settings-outline";
              break;
            default:
              iconName = "ellipse";
          }

          return (
            <Ionicons
              name={iconName}
              size={focused ? size + 2 : size}
              color={color}
              style={{
                textShadowColor: focused ? "#caa85a" : "transparent",
                textShadowRadius: focused ? 6 : 0,
              }}
            />
          );
        },
      })}
    >
      <Tab.Screen name="Inicio" component={DashboardScreen} />
      <Tab.Screen name="Cuentas" component={AccountsScreen} />
      <Tab.Screen name="Movimientos" component={TransactionsScreen} />
      <Tab.Screen name="Deudas" component={LoansScreen} />
      <Tab.Screen name="Presupuesto" component={BudgetsScreen} />
      <Tab.Screen name="Reportes" component={ReportsScreen} />
      <Tab.Screen name="Ajustes" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

/* =======================
   APP
======================= */
export default function App() {
  const [ready, setReady] = useState(false);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await initDb();
        const lock = await isLockEnabled();
        setLocked(lock);
      } catch (e) {
        console.log("INIT ERROR:", e);
        alert("Error init: " + (e?.message || String(e)));
      } finally {
        setReady(true);
      }
    })();
  }, []);

  /* ===== LOADING ===== */
  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: "#070708", justifyContent: "center", padding: 20 }}>
        <View
          style={{
            borderWidth: 1,
            borderColor: "#3b2f16",
            borderRadius: 16,
            padding: 18,
            backgroundColor: "#0b0b0c",
          }}
        >
          <Text style={{ color: "#a59a7a", letterSpacing: 2, fontWeight: "700" }}>
            LEDGER OF THE TARNISHED
          </Text>

          <Text style={{ color: "#f2e3b6", fontSize: 22, fontWeight: "900", marginTop: 10 }}>
            Inicializando…
          </Text>

          <View style={{ marginTop: 14, flexDirection: "row", alignItems: "center", gap: 12 }}>
            <ActivityIndicator />
            <Text style={{ color: "#8f866c" }}>Preparando tu grimorio financiero</Text>
          </View>

          <View style={{ marginTop: 16, height: 1, backgroundColor: "#2a2112" }} />
          <Text style={{ color: "#6f6754", marginTop: 12, fontSize: 12 }}>
            Offline · SQLite · COP
          </Text>
        </View>
      </View>
    );
  }

  /* ===== LOCK ===== */
  if (locked) {
    return (
      <View style={{ flex: 1, backgroundColor: "#070708", justifyContent: "center", padding: 20 }}>
        <View
          style={{
            borderWidth: 1,
            borderColor: "#caa85a",
            borderRadius: 16,
            padding: 18,
            backgroundColor: "#0b0b0c",
          }}
        >
          <Text style={{ color: "#a59a7a", letterSpacing: 2, fontWeight: "700" }}>
            SEAL OF GRACE
          </Text>

          <Text style={{ color: "#f2e3b6", fontSize: 22, fontWeight: "900", marginTop: 10 }}>
            App bloqueada
          </Text>

          <Text style={{ color: "#8f866c", marginTop: 8 }}>
            Requiere biometría (o método alterno del sistema).
          </Text>

          <View style={{ marginTop: 14 }}>
            <ERButton
              title="Desbloquear"
              onPress={async () => {
                const ok = await authenticate();
                if (ok) setLocked(false);
              }}
            />
          </View>

          <View style={{ marginTop: 10 }}>
            <ERButton title="Salir" variant="secondary" onPress={() => setLocked(true)} />
          </View>
        </View>
      </View>
    );
  }

  /* ===== NAVIGATION ===== */
  return (
    <NavigationContainer theme={ER_NAV_THEME}>
      <Stack.Navigator screenOptions={stackScreenOptions}>
        <Stack.Screen name="Home" component={Tabs} options={{ headerShown: false }} />

        <Stack.Screen name="AccountDetail" component={AccountDetailScreen} options={{ title: "Cuenta" }} />
        <Stack.Screen name="AddAccount" component={AddAccountScreen} options={{ title: "Nueva cuenta" }} />
        <Stack.Screen name="AddTransaction" component={AddTransactionScreen} options={{ title: "Nuevo movimiento" }} />

        <Stack.Screen name="LoanDetail" component={LoanDetailScreen} options={{ title: "Préstamo" }} />

        <Stack.Screen name="Goals" component={GoalsScreen} options={{ title: "Ahorros" }} />
        <Stack.Screen name="GoalDetail" component={GoalDetailScreen} options={{ title: "Ahorro" }} />

        <Stack.Screen name="Recurring" component={RecurringScreen} options={{ title: "Suscripciones" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
