import { z } from "zod";
import {
  createBooking,
  listBookings,
  getBookingById,
  updateBookingStatus,
  updateDepositStatus,
  rescheduleBooking,
  updateBookingData,
} from "../../lib/db";
import { ISO_UTC_RE } from "../../lib/booking-utils";
import { isAuthorized, unauthorizedResponse, jsonResponse, corsHeaders } from "./auth";

// Schemas rigorosos de validação Zod
const phoneRegex = /^[\d\s()+-]{8,25}$/;

const updateBookingDataSchema = z
  .object({
    client_name: z.string().trim().min(2, "Nome deve ter ao menos 2 caracteres").optional(),
    client_phone: z
      .string()
      .trim()
      .min(8, "Telefone deve ter ao menos 8 dígitos")
      .regex(phoneRegex, "Formato de telefone inválido")
      .optional(),
    client_email: z.string().email("E-mail inválido").nullable().optional().or(z.literal("")),
    location: z.enum(["estudio", "domicilio", "evento"]).optional(),
    session_type: z.enum(["tatuagem", "flash", "retoque", "projeto", "outro"]).optional(),
    price_total_cents: z.number().int().min(0, "price_total_cents não pode ser negativo").optional(),
    deposit_cents: z.number().int().min(0, "deposit_cents não pode ser negativo").optional(),
    notes: z.string().nullable().optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    { message: "Ao menos um campo deve ser fornecido para atualização." }
  )
  .refine(
    (data) => {
      if (
        data.price_total_cents !== undefined &&
        data.deposit_cents !== undefined &&
        data.price_total_cents > 0
      ) {
        return data.deposit_cents <= data.price_total_cents;
      }
      return true;
    },
    {
      message: "deposit_cents não pode ser superior a price_total_cents",
      path: ["deposit_cents"],
    }
  );

const createBookingSchema = z
  .object({
    lead_id: z.string().nullable().optional(),
    client_name: z.string().trim().min(2, "Nome do cliente deve ter ao menos 2 caracteres"),
    client_phone: z
      .string()
      .trim()
      .min(8, "Telefone do cliente deve ter ao menos 8 dígitos")
      .regex(phoneRegex, "Formato de telefone inválido"),
    client_email: z.string().email("E-mail inválido").nullable().optional().or(z.literal("")),
    location: z.enum(["estudio", "domicilio", "evento"], {
      errorMap: () => ({ message: "Local deve ser 'estudio', 'domicilio' ou 'evento'" }),
    }),
    session_type: z.enum(["tatuagem", "flash", "retoque", "projeto", "outro"], {
      errorMap: () => ({ message: "Tipo de sessão inválido" }),
    }),
    start_at: z
      .string()
      .regex(ISO_UTC_RE, "start_at deve estar no formato ISO UTC estrito (ex: 2026-10-15T13:00:00.000Z)"),
    end_at: z
      .string()
      .regex(ISO_UTC_RE, "end_at deve estar no formato ISO UTC estrito (ex: 2026-10-15T15:00:00.000Z)"),
    status: z.enum(["pendente", "confirmado"]).optional().default("pendente"),
    deposit_cents: z.number().int("deposit_cents deve ser inteiro").min(0, "deposit_cents não pode ser negativo").optional().default(0),
    deposit_status: z.enum(["pendente", "pago", "dispensado"]).optional().default("pendente"),
    price_total_cents: z.number().int("price_total_cents deve ser inteiro").min(0, "price_total_cents não pode ser negativo").optional().default(0),
    project_id: z.string().nullable().optional(),
    session_number: z.number().int().positive().nullable().optional(),
    notes: z.string().nullable().optional(),
    force: z.boolean().optional().default(false),
  })
  .refine((data) => data.end_at > data.start_at, {
    message: "end_at deve ser estritamente posterior a start_at",
    path: ["end_at"],
  })
  .refine(
    (data) => data.price_total_cents === 0 || data.deposit_cents <= data.price_total_cents,
    {
      message: "deposit_cents não pode ser superior a price_total_cents",
      path: ["deposit_cents"],
    }
  );

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
  deposit_cents: z.number().int().min(0, "deposit_cents não pode ser negativo").optional(),
  note: z.string().optional(),
});

const rescheduleSchema = z
  .object({
    start_at: z
      .string()
      .regex(ISO_UTC_RE, "start_at deve estar no formato ISO UTC estrito (ex: 2026-10-15T13:00:00.000Z)"),
    end_at: z
      .string()
      .regex(ISO_UTC_RE, "end_at deve estar no formato ISO UTC estrito (ex: 2026-10-15T15:00:00.000Z)"),
    force: z.boolean().optional().default(false),
    note: z.string().optional(),
  })
  .refine((data) => data.end_at > data.start_at, {
    message: "end_at deve ser estritamente posterior a start_at",
    path: ["end_at"],
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

  // -------------------------------------------------------------
  // 1. GET /api/bookings e GET /api/bookings/:id
  // -------------------------------------------------------------
  if (method === "GET") {
    if (pathParts.length === 0) {
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
            message: parsed.error.errors.map((e) => e.message).join("; "),
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
            success: false,
            error: "Conflito de horário detectado",
            conflict_type: result.error,
            conflicts: result.conflicts || [],
            message: result.message,
          },
          409
        );
      }

      if (result.error === "validation_error") {
        return jsonResponse(
          {
            success: false,
            error: result.message || "Validação falhou ou regra violada",
            message: result.message,
          },
          422
        );
      }

      if (result.requires_force && result.warnings) {
        return jsonResponse(
          {
            success: false,
            requires_force: true,
            warnings: result.warnings,
            message: result.message,
          },
          409
        );
      }

      return jsonResponse(
        {
          success: true,
          booking: result.booking,
          warnings: result.warnings,
        },
        201
      );
    } catch (err) {
      console.error("[Bookings API] Erro ao criar booking:", err);
      return jsonResponse({ error: "Erro interno ao criar agendamento." }, 500);
    }
  }

  // -------------------------------------------------------------
  // 3. PATCH /api/bookings/:id (edição de dados cadastrais/sessão - TASK-05b)
  // -------------------------------------------------------------
  if (method === "PATCH" && pathParts.length === 1) {
    const id = pathParts[0];
    const body = await request.json().catch(() => null);
    if (!body) {
      return jsonResponse({ error: "Corpo da requisição inválido ou vazio." }, 400);
    }

    const parsed = updateBookingDataSchema.safeParse(body);
    if (!parsed.success) {
      return jsonResponse(
        {
          error: "Dados de atualização inválidos.",
          details: parsed.error.format(),
          message: parsed.error.errors.map((e) => e.message).join("; "),
        },
        422
      );
    }

    const result = updateBookingData(id, parsed.data);
    if (result.error === "not_found") {
      return jsonResponse({ error: result.message }, 404);
    }
    if (
      result.error === "invalid_transition" ||
      result.error === "invalid_deposit" ||
      result.error === "validation_error"
    ) {
      return jsonResponse({ error: result.error, message: result.message }, 422);
    }

    return jsonResponse({ success: true, booking: result.booking });
  }

  // -------------------------------------------------------------
  // 4. PATCH sub-rotas (/status, /deposit, /reschedule)
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
          {
            error: "Dados de remarcação inválidos.",
            details: parsed.error.format(),
            message: parsed.error.errors.map((e) => e.message).join("; "),
          },
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
        return jsonResponse({ success: false, error: result.message }, 404);
      }
      if (result.error === "validation_error" || result.error === "invalid_status") {
        return jsonResponse({ success: false, error: result.error, message: result.message }, 422);
      }
      if (result.error === "time_block_conflict" || result.error === "booking_conflict") {
        return jsonResponse(
          {
            success: false,
            error: "Conflito de horário detectado",
            conflict_type: result.error,
            conflicts: result.conflicts || [],
            message: result.message,
          },
          409
        );
      }
      if (result.requires_force && result.warnings) {
        return jsonResponse(
          {
            success: false,
            requires_force: true,
            warnings: result.warnings,
            message: result.message,
          },
          409
        );
      }

      return jsonResponse({
        success: true,
        booking: result.booking,
        warnings: result.warnings,
      });
    }

    return jsonResponse({ error: `Ação '${action}' desconhecida.` }, 404);
  }

  // -------------------------------------------------------------
  // 4. Deleção física proibida (D-01 / TASK-14)
  // -------------------------------------------------------------
  if (method === "DELETE") {
    return jsonResponse(
      {
        success: false,
        error:
          "Agendamentos não podem ser excluídos fisicamente. Utilize PATCH para atualizar o status para 'cancelado'.",
      },
      405,
      { Allow: "GET, PATCH" }
    );
  }

  return jsonResponse({ error: `Método ${method} não suportado.` }, 405);
}
