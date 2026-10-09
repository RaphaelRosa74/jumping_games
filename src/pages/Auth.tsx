import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Field } from "../components/shared";
import { Button } from "../components/ui/button";
import { errorMessage, fieldErrors, http, notify, TOKEN_KEY } from "../lib/api";
import { safeReturn } from "../lib/navigation";
import { queryClient } from "../lib/query";
import type { Session } from "../lib/types";
import { loginSchema, signupSchema } from "../lib/validation";

export default function AuthPage({ register = false }: { register?: boolean }) {
  const navigate = useNavigate(),
    search = useSearch({ strict: false }) as { returnTo?: string };
  const [errors, setErrors] = useState<Record<string, string>>({}),
    [visible, setVisible] = useState(false);
  const mutation = useMutation({
    mutationFn: async (values: Record<string, FormDataEntryValue>) =>
      (
        await http.post<Session & { token: string }>(
          register ? "/auth/register" : "/auth/login",
          values,
        )
      ).data,
    onSuccess: async (data) => {
      await queryClient.cancelQueries();
      queryClient.clear();
      localStorage.setItem(TOKEN_KEY, data.token);
      queryClient.setQueryData(["session"], {
        user: data.user,
        expiresAt: data.expiresAt,
      });
      notify(
        register
          ? "Conta criada. Bem-vindo à Kurio!"
          : "Você entrou na sua conta.",
      );
      await navigate({ to: safeReturn(search.returnTo) });
    },
    onError: (e) => setErrors(fieldErrors(e)),
  });
  return (
    <div className="auth-page">
      <div className="auth-backdrop" aria-hidden="true">
        <div>
          <p>Bem-vindo à Kurio</p>
          <h2>
            SEJA DONO DO FUTURO
            <br />
            DA ARTE DIGITAL
          </h2>
          <p>Uma nova cultura. Sua próxima coleção.</p>
        </div>
        <img src="/assets/emerald.webp" alt="" />
        <div className="auth-art-grid">
          {["sage", "ivory", "golden", "emerald", "sage", "golden"].map(
            (n, i) => (
              <img key={i} src={`/assets/${n}.webp`} alt="" />
            ),
          )}
        </div>
      </div>
      <section className="auth-card">
        <Link to="/" className="auth-logo">
          KURIO
        </Link>
        <h1>{register ? "Criar perfil de colecionador" : "Entrar"}</h1>
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            const values = Object.fromEntries(new FormData(e.currentTarget));
            const result = (register ? signupSchema : loginSchema).safeParse(
              values,
            );
            if (!result.success) {
              setErrors(
                Object.fromEntries(
                  result.error.issues.map((i) => [
                    String(i.path[0]),
                    i.message,
                  ]),
                ),
              );
              return;
            }
            setErrors({});
            mutation.mutate(values);
          }}
        >
          {register && (
            <>
              <Field
                label="Nome de exibição"
                name="name"
                required
                autoComplete="name"
                error={errors.name}
              />
              <Field
                label="Nome de usuário"
                name="username"
                required
                autoComplete="username"
                error={errors.username}
              />
            </>
          )}
          <Field
            label="E-mail"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="contato@email.com"
            error={errors.email}
          />
          <div className="password-wrap">
            <Field
              label="Senha"
              name="password"
              type={visible ? "text" : "password"}
              required
              autoComplete={register ? "new-password" : "current-password"}
              error={errors.password}
            />
            <button
              type="button"
              className="show-password"
              aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
              onClick={() => setVisible(!visible)}
            >
              {visible ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {register && (
            <div className="password-wrap">
             <Field
              label="Confirmar senha"
              name="confirm"
              type={visible ? "text" : "password"}
              required
              autoComplete="new-password"
              error={errors.confirm}
            />
            <button
              type="button"
              className="show-password"
              aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
              onClick={() => setVisible(!visible)}
            >
              {visible ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          )}{" "}
          {!register && (
            <button
              className="text-link forgot"
              type="button"
              onClick={() =>
                notify(
                  "Recuperação por e-mail fora do escopo. Use nova@kurio.test e Kurio123! ou restaure a demonstração.",
                )
              }
            >
              Esqueceu a senha?
            </button>
          )}
          {mutation.isError && (
            <p role="alert" className="field-error">
              {errorMessage(mutation.error)}
            </p>
          )}
          <Button
            type="submit"
            disabled={mutation.isPending}
            className="w-full mt-6"
          >
            {mutation.isPending
              ? "Aguarde…"
              : register
                ? "Criar perfil"
                : "Entrar"}
          </Button>
        </form>
        <div className="social-auth">
          <span>Ou continue com</span>
          <button
            onClick={() =>
              notify(
                "Login com Google não está disponível nesta demonstração. Use e-mail e senha.",
              )
            }
          >
            <b className="google">G</b> Continuar com Google
          </button>
          <button
            onClick={() =>
              notify(
                "Login com Facebook não está disponível nesta demonstração. Use e-mail e senha.",
              )
            }
          >
            <b className="facebook">f</b> Continuar com Facebook
          </button>
        </div>
        <p className="auth-switch">
          {register ? "Já tem uma conta?" : "Novo na Kurio?"}{" "}
          <Link
            to={register ? "/login" : "/cadastro"}
            search={{ returnTo: search.returnTo || "/" }}
          >
            {register ? "Entre" : "Crie uma conta"}
          </Link>
        </p>
        <details className="demo-credentials">
          <summary>Credenciais da demonstração</summary>
          <p>
            nova@kurio.test
            <br />
            alex@kurio.test
            <br />
            Senha: Kurio123!
          </p>
        </details>
      </section>
    </div>
  );
}

export function RegisterPage() {
  return <AuthPage register />;
}
