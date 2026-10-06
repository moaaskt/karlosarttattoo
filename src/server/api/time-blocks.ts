import { z } from "zod";
import { createTimeBlock, listTimeBlocks, deleteTimeBlock } from "../../lib/db";
import { ISO_UTC_RE } from "../../lib/booking-utils";
import { isAuthorized, unauthorizedResponse, jsonResponse, corsHeaders } from "./auth";

const createTimeBlockSchema = z
  .object({
    start_at: z.string().min(1, "start_at é obrigatório"),
    end_at: z.string().optional(),
    all_day: z.number().int().min(0).max(1).optional().default(0),
    reason_tag: z.enum(["viagem_guest", "folga_criacao", "evento", "pessoal", "outro"], {
      errorMap: () => ({ message: "Motivo do bloqueio inválido" }),
    }),
    note: z.string().nullable().optional(),
    force: z.boolean().optional().default(false),
  })
  .refine(
    (data) => {
      if (data.all_day === 1) {
        return /^\d{4}-\d{2}-\d{2}/.test(data.start_at);
      }
      return ISO_UTC_RE.test(data.start_at);
    },
    {
      message: "start_at deve ser formato ISO UTC estrito (ou YYYY-MM-DD se all_day=1)",
      path: ["start_at"],
    },
  )
  .refine(
    (data) => {
      if (!data.end_at) return true;
      if (data.all_day === 1) {
        return /^\d{4}-\d{2}-\d{2}/.test(data.end_at);
      }
      return ISO_UTC_RE.test(data.end_at);
    },
    {
      message: "end_at deve ser formato ISO UTC estrito (ou YYYY-MM-DD se all_day=1)",
      path: ["end_at"],
    },
  );

export async function handleTimeBlocksRequest(request: Request): Promise<Response> {
  const method = request.method.toUpperCase();

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (!isAuthorized(request)) {
    return unauthorizedResponse();
  }

  const url = new URL(request.url);
  const pathParts = url.pathname
    .replace(/^\/api\/time-blocks\/?/, "")
    .split("/")
    .filter(Boolean);

  // 1. GET /api/time-blocks
  if (method === "GET") {
    const from = url.searchParams.get("from") || undefined;
    const to = url.searchParams.get("to") || undefined;
    try {
      const timeBlocks = listTimeBlocks(from, to);
      return jsonResponse({ success: true, timeBlocks });
    } catch (err) {
      console.error("[TimeBlocks API] Erro ao listar bloqueios:", err);
      return jsonResponse({ error: "Erro interno ao listar bloqueios." }, 500);
    }
  }

  // 2. POST /api/time-blocks
  if (method === "POST" && pathParts.length === 0) {
    try {
      const body = await request.json().catch(() => null);
      if (!body) {
        return jsonResponse({ error: "Corpo da requisição inválido ou vazio." }, 400);
      }

      const parsed = createTimeBlockSchema.safeParse(body);
      if (!parsed.success) {
        return jsonResponse(
          {
            error: "Dados inválidos.",
            details: parsed.error.format(),
            message: parsed.error.errors.map((e) => e.message).join("; "),
          },
          422,
        );
      }

      const result = createTimeBlock(parsed.data, parsed.data.force);

      if (result.error === "validation_error") {
        return jsonResponse({ error: result.error, message: result.message }, 422);
      }

      if (result.error === "booking_conflict") {
        return jsonResponse(
          {
            error: result.error,
            conflicts: result.conflicts || [],
            message: result.message,
          },
          409,
        );
      }

      return jsonResponse({ success: true, timeBlock: result.timeBlock }, 201);
    } catch (err) {
      console.error("[TimeBlocks API] Erro ao criar bloqueio:", err);
      return jsonResponse({ error: "Erro interno ao criar bloqueio de tempo." }, 500);
    }
  }

  // 3. DELETE /api/time-blocks/:id
  if (method === "DELETE" && pathParts.length === 1) {
    const id = pathParts[0];
    try {
      const deleted = deleteTimeBlock(id);
      if (!deleted) {
        return jsonResponse({ error: "Bloqueio não encontrado." }, 404);
      }
      return jsonResponse({ success: true, message: "Bloqueio removido com sucesso." });
    } catch (err) {
      console.error(`[TimeBlocks API] Erro ao deletar bloqueio ${id}:`, err);
      return jsonResponse({ error: "Erro interno ao remover bloqueio." }, 500);
    }
  }

  return jsonResponse({ error: `Método ${method} não suportado.` }, 405);
}
