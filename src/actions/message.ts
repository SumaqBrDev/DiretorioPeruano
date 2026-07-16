// src/actions/message.ts
"use server";

import prisma from "@/lib/prisma";

export async function sendMessage({
  fromBusinessId,
  toBusinessId,
  body,
}: {
  fromBusinessId: string;
  toBusinessId: string;
  body: string;
}) {
  const message = await prisma.message.create({
    data: {
      fromBusiness: { connect: { id: fromBusinessId } },
      toBusiness: { connect: { id: toBusinessId } },
      body,
    },
  });

  return message;
}