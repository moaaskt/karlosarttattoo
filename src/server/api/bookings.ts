import { z } from "zod";
import {
  createBooking,
  listBookings,
  getBookingById,
  updateBookingStatus,
  updateDepositStatus,
  rescheduleBooking,
  type Booking,
} from "../../lib/db";
import { isAuthorized, unauthorizedResponse, jsonResponse, corsHeaders } from "./auth";

// Schemas de validação Zod
const createBookingSchema = z.object({
  lead_id: z.string().nullable().optional(),
  client_name: z.string().min(2, "Nome do cliente é obrigatório"),
  client_phone: z.string().min(8, "Telefone do cliente é obrigatório"),
  client_email: z.string().email("E-mail inválido").nullable().optional().or(z.literal("")),
  location: z.enum(["estudio", "domicilio", "evento"], {
    errorMap: () => ({ message: "Local deve ser 'estudio', 'domicilio' ou 'evento'" }),
  }),
  session_type: z.enum(["tatuagem", "flash", "retoque", "projeto", "outro"], {
    errorMap: () => ({ message: "Tipo de sessão inválido" }),
  }),
  start_at: z.string().min(1, "start_at é obrigatório"),
  end_at: z.string().min(1, "end_at é obrigatório"),
  status: z.enum(["pendente", "confirmado"]).optional().default("pendente"),
  deposit_cents: z.number().int().min(0).optional().default(0),
  deposit_status: z.enum(["pendente", "pago", "dispensado"]).optional().default("pendente"),
  price_total_cents: z.number().int().min(0).optional().default(0),
  project_id: z.string().nullable().optional(),
  session_number: z.number().int().positive().nullable().optional(),
  notes: z.string().nullable().optional(),
  force: z.boolean().optional().default(false),
});

const updateStatusSchema = z.object({
  status: z.enum(["pendente", "confirmado", "concluido", "cancelado", "no_show"], {
    errorMap: () => ({ message: "Status inválido" }),
  }),
  depositAction: z.enum(["retido", "devolvido"]).optional(),
  note: z.string().optional(),
});

const updateDepositSchema = z.object({
  deposit_status: z.enum(["pendente", "pago", "dispensado", "retido", "devolvido"], {
    errorMap: () => ({ message: "Status de sinal inválido" }),
  }),
  deposit_cents: z.number().int().min(0).optional(),
  note: z.string().optional(),
});

const rescheduleSchema = z.object({
  start_at: z.string().min(1, "start_at é obrigatório"),
  end_at: z.string().min(1, "end_at é obrigatório"),
  force: z.boolean().optional().default(false),
  note: z.string().optional(),
});

/**
 * Handler principal para rota /api/bookings
 */
export async function handleBookingsRequest(request: Request): Promise<Response> {
  const method = request.method.toUpperCase();

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // D-12: Todas as rotas de agendamento são restritas ao painel administrativo
  if (!isAuthorized(request)) {
    return unauthorizedResponse();
  }

  const url = new URL(request.url);
  const pathParts = url.pathname.replace(/^\/api\/bookings\/?/, "").split("/").filter(Boolean);
  // pathParts:
  // [] -> /api/bookings
  // [id] -> /api/bookings/:id
  // [id, 'status'] -> /api/bookings/:id/status
  // [id, 'deposit'] -> /api/bookings/:id/deposit
  // [id, 'reschedule'] -> /api/bookings/:id/reschedule

  // -------------------------------------------------------------
  // 1. GET /api/bookings e GET /api/bookings/:id
  // -------------------------------------------------------------
  if (method === "GET") {
    if (pathParts.length === 0) {
      // Listagem com filtros
      const from = url.searchParams.get("from") || undefined;
      const to = url.searchParams.get("to") || undefined;
      const status = url.searchParams.get("status") || undefined;

      try {
        const bookings = listBookings(from, to, status);
        return jsonResponse({ success: true, bookings });
      } catch (err) {
        console.error("[Bookings API] Erro ao listar bookings:", err);
        return jsonResponse({ error: "Erro interno ao consultar agendamentos." }, 500);
      }
    }

    if (pathParts.length === 1) {
      // Busca por ID com auditoria
      const id = pathParts[0];
      try {
        const booking = getBookingById(id);
        if (!booking) {
          return jsonResponse({ error: "Agendamento não encontrado." }, 404);
        }
        return jsonResponse({ success: true, booking });
      } catch (err) {
        console.error(`[Bookings API] Erro ao buscar booking ${id}:`, err);
        return jsonResponse({ error: "Erro interno ao buscar agendamento." }, 500);
      }
    }

    return jsonResponse({ error: "Rota não encontrada." }, 404);
  }

  // -------------------------------------------------------------
  // 2. POST /api/bookings
  // -------------------------------------------------------------
  if (method === "POST" && pathParts.length === 0) {
    try {
      const body = await request.json().catch(() => null);
      if (!body) {
        return jsonResponse({ error: "Corpo da requisição inválido ou vazio." }, 400);
      }

      const parsed = createBookingSchema.safeParse(body);
      if (!parsed.success) {
        return jsonResponse(
          {
            error: "Dados de agendamento inválidos.",
            details: parsed.error.format(),
          },
          422
        );
      }

      const input = parsed.data;
      const result = createBooking(
        {
          lead_id: input.lead_id,
          client_name: input.client_name,
          client_phone: input.client_phone,
          client_email: input.client_email,
          location: input.location,
          session_type: input.session_type,
          start_at: input.start_at,
          end_at: input.end_at,
          status: input.status,
          deposit_cents: input.deposit_cents,
          deposit_status: input.deposit_status,
          price_total_cents: input.price_total_cents,
          project_id: input.project_id,
          session_number: input.session_number,
          notes: input.notes,
        },
        input.force
      );

      if (result.error === "time_block_conflict" || result.error === "booking_conflict") {
        return jsonResponse(
          {
            error: result.error,
            conflicts: result.conflicts || [],
            message: result.message,
          },
          409
        );
      }

      if (result.error === "validation_error") {
        return jsonResponse(
          {
            error: result.error,
            message: result.message,
          },
          422
        );
      }

      if (result.warning === "outside_hours" && !result.booking) {
        return jsonResponse(
          {
            warning: "outside_hours",
            message: result.message,
          },
          409
        );
      }

      return jsonResponse(
        {
          success: true,
          booking: result.booking,
          warning: result.warning,
        },
        201
      );
    } catch (err) {
      console.error("[Bookings API] Erro ao criar booking:", err);
      return jsonResponse({ error: "Erro interno ao criar agendamento." }, 500);
    }
  }

  // -------------------------------------------------------------
  // 3. PATCH rotas (/status, /deposit, /reschedule)
  // -------------------------------------------------------------
  if (method === "PATCH" && pathParts.length === 2) {
    const [id, action] = pathParts;
    const body = await request.json().catch(() => null);
    if (!body) {
      return jsonResponse({ error: "Corpo da requisição inválido ou vazio." }, 400);
    }

    // PATCH /api/bookings/:id/status
    if (action === "status") {
      const parsed = updateStatusSchema.safeParse(body);
      if (!parsed.success) {
        return jsonResponse(
          { error: parsed.error.errors[0]?.message || "Dados inválidos." },
          422
        );
      }

      const result = updateBookingStatus(id, parsed.data.status, {
        depositAction: parsed.data.depositAction,
        note: parsed.data.note,
      });

      if (result.error === "not_found") {
        return jsonResponse({ error: result.message }, 404);
      }
      if (
        result.error === "invalid_transition" ||
        result.error === "deposit_required" ||
        result.error === "deposit_action_required"
      ) {
        return jsonResponse({ error: result.error, message: result.message }, 422);
      }

      return jsonResponse({ success: true, booking: result.booking });
    }

    // PATCH /api/bookings/:id/deposit
    if (action === "deposit") {
      const parsed = updateDepositSchema.safeParse(body);
      if (!parsed.success) {
        return jsonResponse(
          { error: parsed.error.errors[0]?.message || "Dados inválidos." },
          422
        );
      }

      const result = updateDepositStatus(
        id,
        parsed.data.deposit_status,
        parsed.data.deposit_cents,
        parsed.data.note
      );

      if (result.error === "not_found") {
        return jsonResponse({ error: result.message }, 404);
      }
      if (result.error === "invalid_deposit_status") {
        return jsonResponse({ error: result.error, message: result.message }, 422);
      }

      return jsonResponse({ success: true, booking: result.booking });
    }

    // PATCH /api/bookings/:id/reschedule
    if (action === "reschedule") {
      const parsed = rescheduleSchema.safeParse(body);
      if (!parsed.success) {
        return jsonResponse(
          { error: parsed.error.errors[0]?.message || "Dados inválidos." },
          422
        );
      }

      const result = rescheduleBooking(
        id,
        parsed.data.start_at,
        parsed.data.end_at,
        parsed.data.force,
        parsed.data.note
      );

      if (result.error === "not_found") {
        return jsonResponse({ error: result.message }, 404);
      }
      if (result.error === "validation_error") {
        return jsonResponse({ error: result.error, message: result.message }, 422);
      }
      if (result.error === "time_block_conflict" || result.error === "booking_conflict") {
        return jsonResponse(
          {
            error: result.error,
            conflicts: result.conflicts || [],
            message: result.message,
          },
          409
        );
      }
      if (result.warning === "outside_hours" && !result.booking) {
        return jsonResponse(
          {
            warning: "outside_hours",
            message: result.message,
          },
          409
        );
      }

      return jsonResponse({
        success: true,
        booking: result.booking,
        warning: result.warning,
      });
    }

    return jsonResponse({ error: `Ação '${action}' desconhecida.` }, 404);
  }

  // -------------------------------------------------------------
  // 4. Deleção física proibida (D-01)
  // -------------------------------------------------------------
  if (method === "DELETE") {
    return jsonResponse(
      {
        error: "forbidden_operation",
        message:
          "Deleção física de agendamento é proibida. Cancele o agendamento para manter o histórico e a auditoria.",
      },
      405
    );
  }

  return jsonResponse({ error: `Método ${method} não suportado.` }, 405);
}
