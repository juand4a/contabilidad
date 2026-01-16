import React from "react";
import { View, Text, TouchableOpacity } from "react-native";

export default function Row({
  title,
  subtitle,
  right,
  onPress,
  iconLeft,
}) {
  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderBottomWidth: 1,
        borderColor: "#2a2112",
        backgroundColor: "#0b0b0c",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        {/* IZQUIERDA */}
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          {iconLeft ? (
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: "#3b2f16",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 10,
                backgroundColor: "#070708",
              }}
            >
              {iconLeft}
            </View>
          ) : null}

          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "900",
                color: "#f2e3b6",
                letterSpacing: 0.3,
              }}
              numberOfLines={1}
            >
              {title}
            </Text>

            {subtitle ? (
              <Text
                style={{
                  marginTop: 4,
                  color: "#a59a7a",
                  fontSize: 13,
                }}
                numberOfLines={2}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>

        {/* DERECHA */}
        {right ? (
          <Text
            style={{
              fontSize: 15,
              fontWeight: "900",
              color: "#caa85a",
              marginLeft: 10,
            }}
            numberOfLines={1}
          >
            {right}
          </Text>
        ) : null}
      </View>
    </Container>
  );
}
