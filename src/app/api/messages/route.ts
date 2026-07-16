// src/app/api/messages/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fromBusinessId, toBusinessId, body: messageBody } = body;

    if (!fromBusinessId || !toBusinessId || !messageBody) {
      return NextResponse.json(
        { error: "Faltan campos requeridos" },
        { status: 400 }
      );
    }

    const message = await prisma.message.create({
      data: {
        fromBusiness: { connect: { id: fromBusinessId } },
        toBusiness: { connect: { id: toBusinessId } },
        body: messageBody,
      },
    });

    return NextResponse.json(message);
  } catch (error) {
    console.error("Error al crear mensaje:", error);
    return NextResponse.json(
      { error: "Error al crear mensaje" },
      { status: 500 }
    );
  }
}