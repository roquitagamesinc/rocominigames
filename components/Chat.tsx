import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '@/lib/store';
import { databases, APPWRITE_DATABASE_ID, APPWRITE_MESSAGES_COLLECTION_ID } from '@/lib/appwrite';
import { v4 as uuidv4 } from 'uuid';

export const Chat: React.FC = () => {
  const { messages, myId, players, addMessage } = useGameStore();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !myId || !players[myId]) return;

    const text = input.trim();
    setInput('');

    // Optimistic UI? Maybe wait for server to ensure order.
    // Let's just send to server.
    const msgId = uuidv4();
    try {
        await databases.createDocument(
            APPWRITE_DATABASE_ID,
            APPWRITE_MESSAGES_COLLECTION_ID,
            msgId,
            {
                playerId: myId,
                playerName: players[myId].name,
                message: text,
                timestamp: Date.now()
            }
        );
    } catch (error) {
        console.error("Failed to send message", error);
    }
  };

  return (
    <div className="flex flex-col h-64 w-80 bg-black/50 p-2 rounded text-white pointer-events-auto">
      <div className="flex-1 overflow-y-auto mb-2 pr-1 scrollbar-thin scrollbar-thumb-gray-600">
        {messages.map((msg) => (
          <div key={msg.id} className="mb-1 text-sm break-words">
            <span className="font-bold text-orange-400">{msg.playerName}:</span> <span className="text-gray-200">{msg.message}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={sendMessage}>
        <input
          className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:border-orange-500"
          placeholder="Escribe un mensaje..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.stopPropagation()} // Prevent triggering game controls if any
        />
      </form>
    </div>
  );
};
