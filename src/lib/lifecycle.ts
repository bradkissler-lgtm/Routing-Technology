import type { Prisma, PrismaClient } from "@prisma/client";
import { deriveApplicationStatus } from "./application-status";

/**
 * Re-reads an Application's full lifecycle chain and writes its derived
 * status (see application-status.ts). Call this inside the same
 * transaction as any mutation to LenderSubmission, Decision, AcceptedOffer,
 * or FundedTransaction — the stored Application.status field exists for
 * query performance, but the lifecycle chain is the source of truth.
 */
export async function recomputeApplicationStatus(
  tx: PrismaClient | Prisma.TransactionClient,
  applicationId: string,
) {
  const submissions = await tx.lenderSubmission.findMany({
    where: { applicationId },
    include: { decision: true },
  });
  const acceptedOffer = await tx.acceptedOffer.findUnique({
    where: { applicationId },
    include: { fundedTransaction: true },
  });

  const status = deriveApplicationStatus({
    submissions: submissions.map((s) => ({
      decisionOutcome: s.decision?.outcome ?? null,
    })),
    hasAcceptedOffer: acceptedOffer !== null,
    hasFundedTransaction: acceptedOffer?.fundedTransaction != null,
  });

  await tx.application.update({
    where: { id: applicationId },
    data: { status },
  });

  return status;
}
