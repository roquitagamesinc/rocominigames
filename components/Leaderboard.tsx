import React from 'react';
import { useGameStore } from '@/lib/store';

export const Leaderboard: React.FC = () => {
  const { players } = useGameStore();

  const sortedPlayers = Object.values(players)
    .filter(p => p.status === 'alive')
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 10);

  return (
    <div className="bg-black/50 p-4 rounded text-white w-48 pointer-events-auto">
      <h3 className="font-bold border-b border-gray-400 mb-2">Clasificación</h3>
      <ol className="list-decimal list-inside text-sm">
        {sortedPlayers.map((p) => (
          <li key={p.id} className="truncate">
            <span className="font-bold">{p.name}</span>: {p.score || 0}
          </li>
        ))}
      </ol>
    </div>
  );
};
