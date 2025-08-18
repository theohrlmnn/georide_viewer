export interface Trip {
  id: number;
  trackerId: number;
  startTime: string;
  endTime: string;
  distance: number;
  averageSpeed: number;
  maxSpeed: number;
  duration: number;
  startLat: number;
  startLon: number;
  endLat: number;
  endLon: number;
  startAddress: string;
  endAddress: string;
  staticImage: string;
  maxAngle: number;
  maxLeftAngle: number;
  maxRightAngle: number;
  averageAngle: number;
  raw?: any;
  // Colonnes PostGIS (optionnelles pour la compatibilité)
  startGeom?: string; // WKT ou GeoJSON string
  endGeom?: string;
  routeGeom?: string;
}

export interface Position {
  fixtime: string;
  latitude: number;
  longitude: number;
  speed: number;
  address: string;
  angle: number;
  // Colonne PostGIS (optionnelle pour la compatibilité)
  geom?: string; // WKT ou GeoJSON string
}

export interface GeoJSONFeature {
  type: 'Feature'
  properties: Record<string, any>
  geometry: { type: 'LineString'; coordinates: [number, number][] }
}