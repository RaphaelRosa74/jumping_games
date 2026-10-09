import { z } from "zod";
const text = z
  .string()
  .trim()
  .min(2, "Informe pelo menos 2 caracteres.")
  .max(80, "Máximo de 80 caracteres.");
const email = z.email("Informe um e-mail válido.").toLowerCase();
const password = z.string().min(8, "Use pelo menos 8 caracteres.").max(128);
export const signupSchema = z
  .object({
    name: text,
    username: z
      .string()
      .regex(/^[a-zA-Z0-9_]{3,24}$/, "Use de 3 a 24 letras, números ou _.")
      .toLowerCase(),
    email,
    password,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "As senhas não coincidem.",
  });
export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Informe a senha."),
});
export const profileSchema = z.object({
  name: text,
  username: z
    .string()
    .regex(/^[a-zA-Z0-9_]{3,24}$/, "Usuário inválido.")
    .toLowerCase(),
  email,
  bio: z.string().max(300),
  avatar: z
    .string()
    .max(300000)
    .refine(
      (s) =>
        s === "" ||
        /^\/assets\/[a-z]+\.webp$/.test(s) ||
        /^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(s),
      "Use uma imagem PNG, JPEG ou WebP de até 200 KB.",
    ),
});
export const passwordSchema = z
  .object({
    current: z.string().min(1, "Informe a senha atual."),
    password,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "As senhas não coincidem.",
  });
export const walletSchema = z
  .object({
    label: text,
    address: z
      .string()
      .trim()
      .regex(
        /^(0x[a-fA-F0-9]{40}|[a-z0-9.-]+\.eth|[1-9A-HJ-NP-Za-km-z]{32,44})$/,
        "Endereço inválido: use 0x + 40 hexadecimais, ENS .eth ou Solana.",
      ),
    network: z.enum(["Ethereum", "Polygon", "Solana"]),
    provider: z.enum(["MetaMask", "WalletConnect", "Coinbase Wallet"]),
    primary: z.boolean(),
  })
  .refine(
    (v) =>
      v.network === "Solana"
        ? /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(v.address)
        : v.address.startsWith("0x") || v.address.endsWith(".eth"),
    { path: ["address"], message: "O endereço não é compatível com a rede." },
  );
export const collectorSchema = z.object({
  name: text,
  username: text,
  email,
  profile: text,
  referral: z.string().min(2, "Informe um código (ex.: KURIO)."),
  ens: z.string().regex(/^[a-z0-9.-]+\.eth$/, "Informe um nome .eth."),
  note: z.string().max(500),
});
