import { create } from 'zustand';

export interface Player {
  id: string;
  x: number;
  y: number;
  size: number;
  color: string;
  name: string;
  status: 'alive' | 'dead';
  lastHeartbeat?: number; // timestamp
}

export interface FoodItem {
  id: string;
  x: number;
  y: number;
  color: string;
}

interface GameState {
  myId: string | null;
  players: Record<string, Player>;
  food: Record<string, FoodItem>;
  setMyId: (id: string) => void;
  updatePlayer: (player: Player) => void;
  removePlayer: (id: string) => void;
  setPlayers: (players: Record<string, Player>) => void;
  updateFood: (item: FoodItem) => void;
  removeFood: (id: string) => void;
  setFood: (food: Record<string, FoodItem>) => void;
}

export const useGameStore = create<GameState>((set) => ({
  myId: null,
  players: {},
  food: {},
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
  updateFood: (item) =>
    set((state) => ({
      food: { ...state.food, [item.id]: item },
    })),
  removeFood: (id) =>
    set((state) => {
      const newFood = { ...state.food };
      delete newFood[id];
      return { food: newFood };
    }),
  setFood: (food) => set({ food }),
}));
