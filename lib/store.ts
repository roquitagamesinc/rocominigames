import { create } from 'zustand';

export interface Player {
  id: string;
  x: number;
  y: number;
  size: number;
  color: string;
  name: string;
  status: 'alive' | 'dead';
}

interface GameState {
  myId: string | null;
  players: Record<string, Player>;
  setMyId: (id: string) => void;
  updatePlayer: (player: Player) => void;
  removePlayer: (id: string) => void;
  setPlayers: (players: Record<string, Player>) => void;
}

export const useGameStore = create<GameState>((set) => ({
  myId: null,
  players: {},
  setMyId: (id) => set({ myId: id }),
  updatePlayer: (player) =>
    set((state) => ({
      players: { ...state.players, [player.id]: player },
    })),
  removePlayer: (id) =>
    set((state) => {
      const newPlayers = { ...state.players };
      delete newPlayers[id];
      return { players: newPlayers };
    }),
  setPlayers: (players) => set({ players }),
}));
