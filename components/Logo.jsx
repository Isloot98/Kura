import React from "react";
import { Image } from "react-native";

export default function Logo({ size = 40 }) {
  return (
    <Image
      source={require("../assets/kura-logo")}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
}
