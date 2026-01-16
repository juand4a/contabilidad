import React from "react";
import { Pressable, Text, View } from "react-native";

export default function ERButton({ title, onPress, variant = "primary", disabled }) {
  const isPrimary = variant === "primary";

  const bg = isPrimary ? "#0f0f10" : "#0b0b0c";
  const border = isPrimary ? "#caa85a" : "#3b2f16";
  const text = isPrimary ? "#f2e3b6" : "#d9cfac";
  const glow = isPrimary ? "#caa85a" : "#000";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          borderRadius: 14,
          borderWidth: 1,
          borderColor: border,
          backgroundColor: bg,
          paddingVertical: 12,
          paddingHorizontal: 14,
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
        },
      ]}
    >
      {/* borde interno ornamental */}
      <View
        style={{
          borderRadius: 12,
          borderWidth: 1,
          borderColor: "#2a2112",
          paddingVertical: 10,
          paddingHorizontal: 12,
          shadowColor: glow,
          shadowOpacity: isPrimary ? 0.18 : 0,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 6 },
        }}
      >
        <Text style={{ color: text, fontWeight: "900", letterSpacing: 1 }}>
          {title.toUpperCase()}
        </Text>
      </View>
    </Pressable>
  );
}
