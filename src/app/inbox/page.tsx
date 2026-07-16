// src/app/inbox/page.tsx
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { MessageList } from "@/components/MessageList";
import { MessageForm } from "@/components/MessageForm";

export default async function InboxPage() {
  const { userId } = await auth();
  if (!userId) {
    return <div className="container mx-auto px-4 py-8 text-center">No autenticado</div>;
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { business: true },
  });

  if (!user?.business) {
    return <div className="container mx-auto px-4 py-8 text-center">No eres dueño de un negocio</div>;
  }

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { fromBusinessId: user.business.id },
        { toBusinessId: user.business.id },
      ],
    },
    include: {
      fromBusiness: true,
      toBusiness: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-playfair text-aji-rojo mb-8">Inbox B2B</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <MessageList messages={messages as any} currentBusinessId={user.business.id} />
        </div>
        <div>
          <MessageForm currentBusinessId={user.business.id} />
        </div>
      </div>
    </div>
  );
}