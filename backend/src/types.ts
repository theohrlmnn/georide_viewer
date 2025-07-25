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
}

export interface Position {
  fix_time: string;
  latitude: number;
  longitude: number;
  speed: number;
  address: string;
  angle: number;
}