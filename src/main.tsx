import "@fontsource/space-mono/latin-400.css";
import "@fontsource/space-mono/latin-700.css";
import "./styles.css";
async function start() {
  const app = import("./App");
  if (import.meta.env.VITE_ENABLE_MOCKS === "true") {
    const { startMocks } = await import("./mocks/browser");
    await startMocks();
  }
  const { mount } = await app;
  mount();
}
void start().catch((error) => {
  console.error(error);
  document.getElementById("root")!.textContent =
    "Não foi possível iniciar a demonstração. Verifique se service workers estão permitidos e recarregue a página.";
});
