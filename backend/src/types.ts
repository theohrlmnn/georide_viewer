export interface Trip {
  id: number;
  trackerId: number;
  averageSpeed: number;
  maxSpeed: number;
  distance: number;
  duration: number;
  startAddress: string;
  niceStartAddress: string | null;
  startLat: number;
  startLon: number;
  endAddress: string;
  niceEndAddress: string | null;
  endLat: number;
  endLon: number;
  startTime: string;
  endTime: string;
  staticImage: string;
  maxAngle: number;
  maxLeftAngle: number;
  maxRightAngle: number;
  averageAngle: number;
  isFavorite: boolean;
}
export interface TripPosition {
  tripId: number;
  latitude: number;
  longitude: number;
  timestamp: string; // ISO 8601 format
}