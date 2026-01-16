import * as LocalAuthentication from "expo-local-authentication";
import { run } from "../db/db";

export async function setLockEnabled(enabled) {
  await run(`INSERT OR REPLACE INTO settings(key, value) VALUES ('lock_enabled', ?)`, [enabled ? "1" : "0"]);
}
export async function isLockEnabled() {
  const r = await run(`SELECT value FROM settings WHERE key='lock_enabled'`);
  return (r.rows.item(0)?.value ?? "0") === "1";
}

export async function authenticate() {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  if (!hasHardware || !isEnrolled) return false;

  const res = await LocalAuthentication.authenticateAsync({
    promptMessage: "Desbloquear app",
    fallbackLabel: "Usar PIN",
  });
  return !!res.success;
}
