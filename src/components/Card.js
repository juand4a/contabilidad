import React from "react";
import { View, Text } from "react-native";

export default function Card({ title, subtitle, children, right }) {
  const rightIsText = typeof right === "string" || typeof right === "number";

  return (
    <View
      style={{
        backgroundColor: "#0b0b0c",
        borderWidth: 1,
        borderColor: "#3b2f16",
        borderRadius: 14,
        padding: 14,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOpacity: 0.35,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
      }}
    >
      {(title || subtitle || right) ? (
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <View style={{ flex: 1 }}>
            {title ? (
              <Text style={{ color: "#e7d7a5", fontSize: 14, letterSpacing: 1, fontWeight: "700" }}>
                {String(title).toUpperCase()}
              </Text>
            ) : null}
            {subtitle ? <Text style={{ color: "#a59a7a", marginTop: 4 }}>{subtitle}</Text> : null}
          </View>

          {right ? (
            rightIsText ? (
              <Text style={{ color: "#f2e3b6", fontWeight: "900", fontSize: 16 }}>{right}</Text>
            ) : (
              <View style={{ alignItems: "center", justifyContent: "center" }}>{right}</View>
            )
          ) : null}
        </View>
      ) : null}

      {children ? <View style={{ marginTop: title || subtitle || right ? 12 : 0 }}>{children}</View> : null}
    </View>
  );
}
