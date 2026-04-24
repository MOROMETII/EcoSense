export interface DataPoint {
  timestamp: number; // unix ms
  value: number;
}

export interface Analytics {
  temperature: DataPoint[];  // °C readings
  energyUsage: DataPoint[];  // Watt readings
  aiSuggestions: string[];
  anomalies: string[];
}

export interface Device {
  id: string;
  type: 'smart_socket' | 'temperature_sensor';
  position: { x: number; y: number };
  energyUsage?: number; // Watts, if smart_socket
  temperature?: number; // °C, if temperature_sensor
}

export interface BlueprintFeature {
  type: 'door' | 'window';
  wall: 'top' | 'bottom' | 'left' | 'right';
  offset: number; // 0–1 normalised position along the wall
}

export interface BlueprintData {
  features: BlueprintFeature[];
}

export interface Room {
  id: string;
  name: string;
  devices: Device[];
  blueprint?: BlueprintData;
  analytics: Analytics;
}

export interface User {
  id: string;
  name: string;
  email: string;
  token: string;
}
