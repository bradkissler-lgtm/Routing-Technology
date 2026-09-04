import { Prisma, type PrismaClient } from "@prisma/client";

/**
 * Append-only audit trail. Every mutation to a credit application or end
 * buyer record should write one row here in the same transaction as the
 * mutation itself. Never update or delete a row in this table from
 * application code — see prisma/schema.prisma, AuditLogEntry.
 */
export async function recordAuditEvent(
  tx: PrismaClient | Prisma.TransactionClient,
  event: {
    manufacturerId: string;
    entityType: string;
    entityId: string;
    action: string;
    actorType: "BUYER" | "DEALER" | "MANUFACTURER" | "SYSTEM";
    actorId?: string;
    payload?: Record<string, unknown>;
  },
) {
  await tx.auditLogEntry.create({
    data: {
      manufacturerId: event.manufacturerId,
      entityType: event.entityType,
      entityId: event.entityId,
      action: event.action,
      actorType: event.actorType,
      actorId: event.actorId,
      payloadJson: (event.payload ?? undefined) as
        | Prisma.InputJsonValue
        | undefined,
    },
  });
}
