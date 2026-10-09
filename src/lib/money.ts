/** Decimal ETH <-> integer wei. Never use floating point for monetary math. */
const SCALE = 10n ** 18n;
export function wei(value: string): bigint {
  if (!/^\d+(\.\d{1,18})?$/.test(value))
    throw new Error("ETH decimal inválido");
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * SCALE + BigInt(fraction.padEnd(18, "0"));
}
export function eth(value: bigint): string {
  const s = value < 0n ? "-" : "";
  const v = value < 0n ? -value : value;
  const f = (v % SCALE).toString().padStart(18, "0").replace(/0+$/, "");
  return `${s}${v / SCALE}${f ? "." + f : ""}`;
}
export function money(value: string): string {
  const [a, b = ""] = value.split(".");
  return `${a}.${b.padEnd(2, "0")} ETH`;
}
