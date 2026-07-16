// src/components/MessageForm.tsx

import { useState } from "react";

interface MessageFormProps {
  currentBusinessId: string;
  onSendMessage?: (toBusinessId: string, body: string) => void;
}

const mockBusinesses = [
  { id: "business-1", name: "Sabores do Peru" },
  { id: "business-2", name: "Lima Criolla" },
  { id: "business-3", name: "Ceviche House SP" },
  { id: "business-4", name: "Andina Grill" },
  { id: "business-5", name: "Pisco Bar" },
];

export const MessageForm = ({ currentBusinessId, onSendMessage }: MessageFormProps) => {
  const [toBusinessId, setToBusinessId] = useState("");
  const [body, setBody] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!toBusinessId || !body.trim()) return;

    if (onSendMessage) {
      onSendMessage(toBusinessId, body.trim());
    } else {
      alert(`Mensagem enviada para ${mockBusinesses.find(b => b.id === toBusinessId)?.name || toBusinessId}:\n\n${body.trim()}`);
    }
    setBody("");
    setToBusinessId("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white dark:bg-noche-lima p-6 rounded-2xl shadow-lg border border-oro-inca/20">
      <h3 className="font-playfair text-xl font-bold text-aji-rojo mb-4">Nova Mensagem</h3>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Para</label>
        <select
          value={toBusinessId}
          onChange={(e) => setToBusinessId(e.target.value)}
          className="w-full p-3 rounded-lg border border-oro-inca/30 bg-white dark:bg-noche-lima text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-aji-rojo"
          required
        >
          <option value="">Selecione um negócio</option>
          {mockBusinesses
            .filter(b => b.id !== currentBusinessId)
            .map((business) => (
              <option key={business.id} value={business.id}>
                {business.name}
              </option>
            ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mensagem</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="w-full p-3 rounded-lg border border-oro-inca/30 bg-white dark:bg-noche-lima text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-aji-rojo"
          rows={4}
          required
          placeholder="Escreva sua mensagem..."
        />
      </div>
      <button
        type="submit"
        disabled={!toBusinessId || !body.trim()}
        className="w-full bg-aji-rojo text-white py-3 rounded-xl font-semibold hover:bg-aji-rojo/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Enviar Mensagem
      </button>
    </form>
  )
}