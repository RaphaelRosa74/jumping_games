import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";
import { initialize } from "./database";
import { socketHandler, startClock } from "./realtime";
export async function startMocks() {
  const worker = setupWorker(...handlers, socketHandler);
  await Promise.all([
    initialize(),
    worker.start({ onUnhandledRequest: "bypass", quiet: true }),
  ]);
  startClock();
}
