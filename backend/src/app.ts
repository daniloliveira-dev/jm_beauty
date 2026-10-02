import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env.js";
import { buildControllers } from "./config/container.js";
import { errorMiddleware } from "./middlewares/errorMiddleware.js";
import { apiResponseEnvelope } from "./middlewares/responseMiddleware.js";
import { createRoutes } from "./routes/index.js";

const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "JM Beauty API",
    version: "2.0.0",
    description: "API REST do sistema de gestão e agendamento JM Beauty.",
  },
  servers: [{ url: "/api" }],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      Role: { type: "string", enum: ["user", "operator", "admin"] },
      AppointmentStatus: { type: "string", enum: ["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW"] },
      Error: { type: "object", required: ["success", "message"], properties: { success: { type: "boolean", example: false }, message: { type: "string" }, code: { type: "string" } } },
    },
  },
  paths: {
    "/auth/register": { post: { summary: "Criar conta USER" } },
    "/auth/login": { post: { summary: "Iniciar sessão e obter tokens" } },
    "/auth/refresh": { post: { summary: "Rotacionar refresh token" } },
    "/auth/logout": { post: { summary: "Revogar sessão", security: [{ bearerAuth: [] }] } },
    "/auth/me": { get: { summary: "Consultar usuário autenticado", security: [{ bearerAuth: [] }] } },
    "/auth/forgot": { post: { summary: "Solicitar recuperação de senha" } },
    "/auth/reset": { post: { summary: "Redefinir senha com token de uso único" } },
    "/users": {
      get: { summary: "Listar usuários (ADMIN)", security: [{ bearerAuth: [] }], parameters: [{ in: "query", name: "page", schema: { type: "integer" } }, { in: "query", name: "limit", schema: { type: "integer" } }, { in: "query", name: "search", schema: { type: "string" } }] },
      post: { summary: "Criar USER/OPERATOR (ADMIN)", security: [{ bearerAuth: [] }] },
    },
    "/users/{id}/access": { patch: { summary: "Alterar role/estado (ADMIN)", security: [{ bearerAuth: [] }] } },
    "/users/{id}": { delete: { summary: "Anonimizar/remover usuário (ADMIN)", security: [{ bearerAuth: [] }] } },
    "/services": { get: { summary: "Listar serviços", security: [{ bearerAuth: [] }] }, post: { summary: "Cadastrar serviço (OPERATOR/ADMIN)", security: [{ bearerAuth: [] }] } },
    "/services/{id}": { put: { summary: "Atualizar serviço (OPERATOR/ADMIN)", security: [{ bearerAuth: [] }] } },
    "/professionals": { get: { summary: "Listar profissionais", security: [{ bearerAuth: [] }] }, post: { summary: "Cadastrar profissional (OPERATOR/ADMIN)", security: [{ bearerAuth: [] }] } },
    "/professionals/{id}": { put: { summary: "Atualizar profissional (OPERATOR/ADMIN)", security: [{ bearerAuth: [] }] } },
    "/customers": { get: { summary: "Listar clientes (OPERATOR/ADMIN)", security: [{ bearerAuth: [] }] }, post: { summary: "Cadastrar cliente", security: [{ bearerAuth: [] }] } },
    "/customers/{id}": { put: { summary: "Atualizar cliente", security: [{ bearerAuth: [] }] } },
    "/availability": { get: { summary: "Consultar horários livres", security: [{ bearerAuth: [] }] } },
    "/appointments": { get: { summary: "Listar agendamentos próprios ou operacionais", security: [{ bearerAuth: [] }] }, post: { summary: "Criar agendamento", security: [{ bearerAuth: [] }] } },
    "/appointments/{id}/cancel": { patch: { summary: "Cancelar agendamento com validação de propriedade", security: [{ bearerAuth: [] }] } },
    "/appointments/{id}/reschedule": { patch: { summary: "Reagendar atendimento", security: [{ bearerAuth: [] }] } },
    "/appointments/{id}/status": { patch: { summary: "Transicionar status (OPERATOR/ADMIN)", security: [{ bearerAuth: [] }] } },
    "/appointments/{id}/order": { get: { summary: "Consultar comanda (OPERATOR/ADMIN)", security: [{ bearerAuth: [] }] } },
    "/appointments/{id}/order/items": { post: { summary: "Adicionar item à comanda", security: [{ bearerAuth: [] }] } },
    "/appointments/{id}/order/items/{item}": { delete: { summary: "Remover produto e repor estoque", security: [{ bearerAuth: [] }] } },
    "/appointments/{id}/order/adjustment": { put: { summary: "Aplicar desconto/acréscimo", security: [{ bearerAuth: [] }] } },
    "/payments": { post: { summary: "Registrar pagamento idempotente", security: [{ bearerAuth: [] }] } },
    "/refunds": { post: { summary: "Registrar estorno parcial idempotente", security: [{ bearerAuth: [] }] } },
    "/cash": { get: { summary: "Listar caixas", security: [{ bearerAuth: [] }] } },
    "/cash/open": { post: { summary: "Abrir caixa diário", security: [{ bearerAuth: [] }] } },
    "/cash/{date}/close": { post: { summary: "Fechar caixa e calcular saldo esperado", security: [{ bearerAuth: [] }] } },
    "/cash/{date}/reconcile": { post: { summary: "Conferir saldo físico", security: [{ bearerAuth: [] }] } },
    "/expenses": { get: { summary: "Listar despesas", security: [{ bearerAuth: [] }] }, post: { summary: "Registrar despesa", security: [{ bearerAuth: [] }] } },
    "/reports": { get: { summary: "Relatório por período em JSON/CSV/PDF (ADMIN)", security: [{ bearerAuth: [] }] } },
    "/reports/daily": { get: { summary: "Faturamento diário (ADMIN)", security: [{ bearerAuth: [] }] } },
    "/reports/monthly": { get: { summary: "Faturamento mensal (ADMIN)", security: [{ bearerAuth: [] }] } },
    "/reports/services": { get: { summary: "Serviços mais realizados (ADMIN)", security: [{ bearerAuth: [] }] } },
    "/reports/payments": { get: { summary: "Pagamentos por método (ADMIN)", security: [{ bearerAuth: [] }] } },
    "/reports/appointments": { get: { summary: "Atendimentos por período (ADMIN)", security: [{ bearerAuth: [] }] } },
    "/settings": { get: { summary: "Consultar configurações (ADMIN)", security: [{ bearerAuth: [] }] }, put: { summary: "Atualizar configurações (ADMIN)", security: [{ bearerAuth: [] }] } },
    "/settings/business-hours": { get: { summary: "Listar intervalos de funcionamento", security: [{ bearerAuth: [] }] }, put: { summary: "Configurar intervalos de funcionamento", security: [{ bearerAuth: [] }] } },
    "/blocks": { get: { summary: "Listar bloqueios", security: [{ bearerAuth: [] }] }, post: { summary: "Criar bloqueio de agenda", security: [{ bearerAuth: [] }] } },
    "/blocks/{id}": { delete: { summary: "Remover bloqueio", security: [{ bearerAuth: [] }] } },
    "/products": { get: { summary: "Listar estoque", security: [{ bearerAuth: [] }] }, post: { summary: "Cadastrar produto", security: [{ bearerAuth: [] }] } },
    "/products/{id}": { put: { summary: "Atualizar produto", security: [{ bearerAuth: [] }] } },
    "/commission-rules": { get: { summary: "Listar percentuais de comissão", security: [{ bearerAuth: [] }] } },
    "/commission-rules/{id}": { put: { summary: "Configurar comissão (ADMIN)", security: [{ bearerAuth: [] }] } },
    "/commissions": { get: { summary: "Listar comissões", security: [{ bearerAuth: [] }] } },
    "/commissions/{id}/pay": { post: { summary: "Registrar pagamento de comissão", security: [{ bearerAuth: [] }] } },
    "/waitlist": { get: { summary: "Consultar lista de espera", security: [{ bearerAuth: [] }] }, post: { summary: "Entrar na lista de espera", security: [{ bearerAuth: [] }] } },
    "/notifications": { get: { summary: "Listar notificações do usuário", security: [{ bearerAuth: [] }] } },
    "/push/device": { post: { summary: "Registrar dispositivo push", security: [{ bearerAuth: [] }] }, delete: { summary: "Remover dispositivos push", security: [{ bearerAuth: [] }] } },
    "/monthly-reports": { get: { summary: "Listar snapshots mensais (ADMIN)", security: [{ bearerAuth: [] }] } },
    "/monthly-reports/{month}": { get: { summary: "Consultar snapshot mensal (ADMIN)", security: [{ bearerAuth: [] }] } },
    "/audit": { get: { summary: "Consultar auditoria (ADMIN)", security: [{ bearerAuth: [] }] } },
  },
};

export function createApp() {
  const app = express();
  const allowedOrigins = env.CORS_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean);

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin))
        return callback(null, true);
      callback(new Error("Origem não permitida pelo CORS."));
    },
    credentials: !allowedOrigins.includes("*"),
  }));
  app.use(express.json({ limit: "100kb" }));
  app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
  app.use(rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    limit: env.RATE_LIMIT_MAX,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  }));
  app.use(apiResponseEnvelope);
  app.get(["/health", "/api/health"], (_req, res) => res.json({ status: "ok" }));
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));

  const routes = createRoutes(buildControllers());
  app.use(routes);
  app.use("/api", routes);
  app.use((_req, res) => res.status(404).json({ success: false, message: "Endpoint não encontrado." }));
  app.use(errorMiddleware);
  return app;
}
