// src/components/MessageList.tsx

interface Message {
  id: string;
  fromBusiness: { id: string; name: string };
  toBusiness: { id: string; name: string };
  body: string;
  read: boolean;
  createdAt: string;
  fromBusinessId: string;
  toBusinessId: string;
}

interface MessageListProps {
  messages: Message[];
  currentBusinessId: string;
}

export const MessageList = ({ messages, currentBusinessId }: MessageListProps) => {
  if (messages.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg font-medium">Nenhuma mensagem</p>
        <p className="text-sm mt-1">Selecione uma conversa ou envie uma nova mensagem</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`p-4 rounded-xl ${
            message.fromBusinessId === currentBusinessId
              ? "bg-oro-inca/10 border border-oro-inca/30"
              : "bg-white dark:bg-noche-lima border border-oro-inca/20"
          } ${message.read ? "" : "ring-2 ring-aji-rojo/30"}`}
        >
          <div className="flex justify-between items-start mb-2">
            <div>
              <h4 className="font-semibold text-noche-lima dark:text-white">
                {message.fromBusinessId === currentBusinessId
                  ? "Você"
                  : message.fromBusiness.name}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Para: {message.toBusinessId === currentBusinessId
                  ? "Você"
                  : message.toBusiness.name}
              </p>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-500">
              {new Date(message.createdAt).toLocaleString("pt-BR")}
            </span>
          </div>
          <p className="text-gray-700 dark:text-gray-300">{message.body}</p>
        </div>
      ))}
    </div>
  )
}