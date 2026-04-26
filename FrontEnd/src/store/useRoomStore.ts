import { create } from "zustand";
import type { Room, DataPoint } from "../models/types";

const now = Date.now();

const pts = (base: number, noise: number, count = 12): DataPoint[] =>
  Array.from({ length: count }, (_, i) => ({
    timestamp: now - (count - i) * 3_600_000,
    value: +(base + (Math.random() - 0.5) * noise).toFixed(1),
  }));

const MOCK_ROOMS: Room[] = [
  {
    id: "ROOM_101",
    name: "Office A",
    devices: [
      {
        id: "d1",
        type: "temperature_sensor",
        position: { x: 2, y: 3 },
        temperature: 22.5,
      },
      ...Array.from({ length: 20 }, (_, i) => ({
        id: `SKT_${String(i + 1).padStart(2, "0")}`,
        type: "smart_socket" as const,
        position: { x: (i % 5) * 2, y: Math.floor(i / 5) * 2 },
        energyUsage: 50 + Math.random() * 100,
      })),
    ],
    blueprint: {
      features: [
        { type: "door", wall: "bottom", offset: 0.3 },
        { type: "window", wall: "top", offset: 0.6 },
        { type: "window", wall: "right", offset: 0.5 },
      ],
    },
    analytics: {
      temperature: pts(22, 4),
      energyUsage: pts(300, 100),
      aiSuggestions: [],
      anomalies: [],
    },
  },
];

interface RoomStore {
  rooms: Room[];
  addRoom: (room: Room) => void;
  updateRoom: (room: Room) => void;
  deleteRoom: (id: string) => void;
  toggleSocketDeactivated: (roomId: string, socketId: string) => void;
}

export const useRoomStore = create<RoomStore>((set) => ({
  rooms: MOCK_ROOMS,
  addRoom: (room) => set((s) => ({ rooms: [...s.rooms, room] })),
  updateRoom: (room) =>
    set((s) => ({ rooms: s.rooms.map((r) => (r.id === room.id ? room : r)) })),
  deleteRoom: (id) =>
    set((s) => ({ rooms: s.rooms.filter((r) => r.id !== id) })),
  toggleSocketDeactivated: (roomId, socketId) =>
    set((s) => ({
      rooms: s.rooms.map((r) =>
        r.id !== roomId
          ? r
          : {
              ...r,
              devices: r.devices.map((d) =>
                d.id !== socketId ? d : { ...d, deactivated: !d.deactivated },
              ),
            },
      ),
    })),
}));
