import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

export const API = "http://192.168.100.200:8081";

if (__DEV__) {
  console.log("[Moneytix] API configurada:", API);
}

export type User = {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: "admin" | "operator" | "cliente";
};

type Session = {
  token: string;
  accessToken?: string;
  refreshToken?: string;
  user: User;
};

type Auth = {
  session: Session | null;
  ready: boolean;
  setSession: (s: Session | null) => Promise<void>;
  request: (
    path: string,
    method?: string,
    body?: unknown
  ) => Promise<any>;
};

const Context = createContext<Auth>(null!);

export const useAuth = () => useContext(Context);

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, change] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        if (Platform.OS !== "web") {
          const raw = await SecureStore.getItemAsync("session");

          if (raw) {
            change(JSON.parse(raw));
          }
        }
      } catch (error) {
        if (__DEV__) {
          console.error("[Moneytix] Erro ao recuperar sessão:", error);
        }
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const setSession = useCallback(async (s: Session | null) => {
    change(s);

    if (Platform.OS !== "web") {
      if (s) {
        await SecureStore.setItemAsync("session", JSON.stringify(s));
      } else {
        await SecureStore.deleteItemAsync("session");
      }
    }
  }, []);

  const request = useCallback(
    async (
      path: string,
      method = "GET",
      body?: unknown
    ) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);

      const send = (accessToken?: string) =>
        fetch(`${API}${path}`, {
          method,
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            ...(accessToken
              ? { Authorization: `Bearer ${accessToken}` }
              : {}),
          },
          body: body === undefined ? undefined : JSON.stringify(body),
        });

      const parseResponse = async (response: Response) => {
        if (response.status === 204) {
          return null;
        }

        const responseText = await response.text();

        if (!responseText.trim()) {
          return null;
        }

        try {
          return JSON.parse(responseText);
        } catch {
          if (__DEV__) {
            console.error("[Moneytix] Resposta inválida da API:", {
              url: `${API}${path}`,
              status: response.status,
              contentType: response.headers.get("content-type"),
              response: responseText.slice(0, 500),
            });
          }

          throw new Error(
            `O servidor retornou uma resposta inválida (HTTP ${response.status}). Verifique a URL da API.`
          );
        }
      };

      try {
        let response: Response;

        try {
          response = await send(
            session?.accessToken || session?.token
          );
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") {
            throw new Error("Conexão demorou. Tente novamente.");
          }

          if (__DEV__) {
            console.error("[Moneytix] Falha na conexão com a API:", {
              url: `${API}${path}`,
              error,
            });
          }

          throw new Error(
            "Não foi possível conectar ao servidor. Verifique sua conexão e o endereço da API."
          );
        }

        if (
          response.status === 401 &&
          session?.refreshToken &&
          path !== "/auth/refresh"
        ) {
          let refreshResponse: Response;

          try {
            refreshResponse = await fetch(`${API}/auth/refresh`, {
              method: "POST",
              headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                refreshToken: session.refreshToken,
              }),
              signal: controller.signal,
            });
          } catch (error) {
            if (__DEV__) {
              console.error(
                "[Moneytix] Falha ao renovar sessão:",
                error
              );
            }

            throw new Error(
              "Não foi possível renovar sua sessão. Tente novamente."
            );
          }

          if (refreshResponse.ok) {
            const refreshed = await parseResponse(refreshResponse);

            if (
              !refreshed ||
              !(refreshed.accessToken || refreshed.token)
            ) {
              throw new Error(
                "O servidor não retornou um token válido ao renovar a sessão."
              );
            }

            const nextSession: Session = {
              ...session,
              ...refreshed,
              token: refreshed.accessToken || refreshed.token,
            };

            await setSession(nextSession);

            response = await send(
              nextSession.accessToken || nextSession.token
            );
          } else if (refreshResponse.status === 401) {
            await setSession(null);
          }
        }

        const json = await parseResponse(response);

        if (response.status === 401 && session) {
          await setSession(null);
        }

        if (!response.ok) {
          throw new Error(
            json?.message || `Não foi possível concluir (HTTP ${response.status}).`
          );
        }

        return json;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          throw new Error("Conexão demorou. Tente novamente.");
        }

        throw error;
      } finally {
        clearTimeout(timer);
      }
    },
    [session, setSession]
  );

  return (
    <Context.Provider
      value={{
        session,
        ready,
        setSession,
        request,
      }}
    >
      {children}
    </Context.Provider>
  );
}

export const brl = (c: number) =>
  ((c || 0) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

export const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

export const displayDate = (value: string) =>
  new Date(value).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

export function cents(s: string) {
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(s.trim())) {
    throw new Error("Informe um valor válido, como 80,00");
  }

  const [a, b = ""] = s.trim().replace(",", ".").split(".");

  return Number(a) * 100 + Number(b.padEnd(2, "0"));
}