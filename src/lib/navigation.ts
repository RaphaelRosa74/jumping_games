export function safeReturn(value: unknown) {
  return typeof value === "string" &&
    /^\/(?!\/)/.test(value) &&
    !value.includes("\\") &&
    !/^\/(login|cadastro)/.test(value)
    ? value
    : "/";
}
