import { nanoid } from "nanoid";
import { prisma } from "../../lib/prisma.js";
import { errors } from "../../lib/errors.js";
import type { z } from "zod";
import type { paymentIntentSchema, PaymentProvider } from "@umuturanyi/shared";

/**
 * Umuturanyi Pay — a lightweight wallet over a simulated Mobile Money rail.
 * In production, `provider` calls would hand off to MTN MoMo / Airtel Money
 * collection APIs and reconcile via webhooks; here the rail settles instantly so
 * the full UX (balance, top-up, pay, history) is exercisable end to end.
 */
async function ensureWallet(userId: string) {
  return prisma.wallet.upsert({ where: { userId }, create: { userId }, update: {} });
}

export async function getWallet(userId: string) {
  const wallet = await ensureWallet(userId);
  const transactions = await prisma.walletTransaction.findMany({
    where: { walletId: wallet.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return {
    balance: wallet.balance,
    transactions: transactions.map((t) => ({
      id: t.id,
      amount: t.amount,
      kind: t.kind,
      description: t.description,
      ref: t.ref,
      createdAt: t.createdAt.toISOString(),
    })),
  };
}

export async function topUp(userId: string, amount: number, provider: PaymentProvider, phone?: string) {
  if (amount <= 0) throw errors.badRequest("Amafaranga agomba kurenga 0");
  const wallet = await ensureWallet(userId);
  const ref = `momo_${nanoid(12)}`;
  await prisma.$transaction([
    prisma.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: amount } } }),
    prisma.walletTransaction.create({
      data: { walletId: wallet.id, amount, kind: "topup", description: `Kongeramo amafaranga (${provider})`, ref },
    }),
    prisma.payment.create({
      data: { userId, amount, provider, status: "success", purpose: "topup", ref },
    }),
  ]);
  void phone;
  return getWallet(userId);
}

export async function pay(userId: string, input: z.infer<typeof paymentIntentSchema>) {
  const wallet = await ensureWallet(userId);
  if (wallet.balance < input.amount) throw errors.badRequest("Amafaranga ntahagije kuri konti yawe");

  const ref = `pay_${nanoid(12)}`;
  await prisma.$transaction(async (tx) => {
    await tx.wallet.update({ where: { id: wallet.id }, data: { balance: { decrement: input.amount } } });
    await tx.walletTransaction.create({
      data: { walletId: wallet.id, amount: -input.amount, kind: "payment", description: input.purpose, ref },
    });
    await tx.payment.create({
      data: {
        userId,
        amount: input.amount,
        provider: input.provider,
        status: "success",
        purpose: input.purpose,
        listingId: input.listingId ?? null,
        ref,
      },
    });
  });

  // If paying for a listing, mark it reserved for the buyer's clarity.
  if (input.listingId) {
    await prisma.listing
      .updateMany({ where: { id: input.listingId, status: "active" }, data: { status: "reserved" } })
      .catch(() => {});
  }
  return { ref, ...(await getWallet(userId)) };
}
