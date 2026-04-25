import { create } from 'zustand';
import type { Room, DataPoint } from '../models/types';

const now = Date.now();

const pts = (base: number, noise: number, count = 12): DataPoint[] =>
  Array.from({ length: count }, (_, i) => ({
    timestamp: now - (count - i) * 3_600_000,
    value: +(base + (Math.random() - 0.5) * noise).toFixed(1),
  }));

const MOCK_ROOMS: Room[] = [
  {
    id: '1',
    name: 'Office A',
    devices: [
      { id: 'd1', type: 'temperature_sensor', position: { x: 2, y: 3 }, temperature: 22.5 },
      { id: 'SKT_01', type: 'smart_socket', position: { x: 5, y: 1 }, energyUsage: 120 },
      { id: 'SKT_02', type: 'smart_socket', position: { x: 6, y: 5 }, energyUsage: 340 },
    ],
    blueprint: {
      features: [
        { type: 'door',   wall: 'bottom', offset: 0.3 },
        { type: 'window', wall: 'top',    offset: 0.6 },
        { type: 'window', wall: 'right',  offset: 0.5 },
      ],
    },
    analytics: {
      temperature: pts(22, 4),
      energyUsage: pts(300, 100),
      aiSuggestions: ['High energy usage detected from socket #3'],
      anomalies: [],
    },
  },
  {
    id: '2',
    name: 'Meeting Room',
    devices: [
      { id: 'd4', type: 'temperature_sensor', position: { x: 3, y: 4 }, temperature: 19.2 },
      { id: 'SKT_01', type: 'smart_socket', position: { x: 1, y: 2 }, energyUsage: 80 },
    ],
    blueprint: {
      features: [
        { type: 'door',   wall: 'left',   offset: 0.7 },
        { type: 'window', wall: 'top',    offset: 0.4 },
        { type: 'window', wall: 'top',    offset: 0.75 },
        { type: 'window', wall: 'right',  offset: 0.35 },
      ],
    },
    analytics: {
      temperature: pts(18, 6),
      energyUsage: pts(120, 40),
      aiSuggestions: ['Possible open window detected (temperature drop)'],
      anomalies: ['Temperature dropped 4°C in the last hour'],
    },
  },
];

interface RoomStore {
  rooms: Room[];
  addRoom: (room: Room) => void;
  updateRoom: (room: Room) => void;
  deleteRoom: (id: string) => void;
}

export const useRoomStore = create<RoomStore>((set) => ({
  rooms: MOCK_ROOMS,
  addRoom: (room) => set((s) => ({ rooms: [...s.rooms, room] })),
  updateRoom: (room) =>
    set((s) => ({ rooms: s.rooms.map((r) => (r.id === room.id ? room : r)) })),
  deleteRoom: (id) => set((s) => ({ rooms: s.rooms.filter((r) => r.id !== id) })),
}));
