import { http, TOKEN_KEY } from "./api";
import { queryClient } from "./query";
export async function logout() {
  try {
    await http.post("/auth/logout");
  } finally {
    localStorage.removeItem(TOKEN_KEY);
    await queryClient.cancelQueries();
    queryClient.clear();
    window.dispatchEvent(new Event("signed-out"));
  }
}
