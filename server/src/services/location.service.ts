import { GeoLocation, UserLocation } from '../types';

// In-memory location store (swap for Firestore later)
const locationStore = new Map<string, UserLocation>();

// ~1.1km grid cells at equator
const CELL_SIZE = 0.01;

export function calculateGeoCell(location: GeoLocation): string {
  const latCell = Math.floor(location.lat / CELL_SIZE);
  const lngCell = Math.floor(location.lng / CELL_SIZE);
  return `${latCell}:${lngCell}`;
}

export function getAdjacentCells(cell: string): string[] {
  const [lat, lng] = cell.split(':').map(Number);
  const cells: string[] = [];
  for (let dLat = -1; dLat <= 1; dLat++) {
    for (let dLng = -1; dLng <= 1; dLng++) {
      cells.push(`${lat + dLat}:${lng + dLng}`);
    }
  }
  return cells;
}

export function updateUserLocation(
  userId: string,
  userName: string,
  location: GeoLocation
): UserLocation {
  const geoCell = calculateGeoCell(location);
  const userLocation: UserLocation = {
    userId,
    userName,
    location,
    geoCell,
    isActive: true,
    lastUpdated: Date.now(),
  };
  locationStore.set(userId, userLocation);
  return userLocation;
}

export function getUserLocation(userId: string): UserLocation | undefined {
  return locationStore.get(userId);
}

export function getActiveLocations(): UserLocation[] {
  const now = Date.now();
  const TEN_MINUTES = 10 * 60 * 1000;
  const active: UserLocation[] = [];

  for (const [, loc] of locationStore) {
    if (now - loc.lastUpdated < TEN_MINUTES) {
      active.push(loc);
    } else {
      loc.isActive = false;
    }
  }
  return active;
}

export function getUsersInCells(
  cells: string[],
  excludeUserId?: string
): UserLocation[] {
  const cellSet = new Set(cells);
  const users: UserLocation[] = [];
  const now = Date.now();
  const TEN_MINUTES = 10 * 60 * 1000;

  for (const [, loc] of locationStore) {
    if (
      cellSet.has(loc.geoCell) &&
      loc.isActive &&
      loc.userId !== excludeUserId &&
      now - loc.lastUpdated < TEN_MINUTES
    ) {
      users.push(loc);
    }
  }
  return users;
}

export function removeUserLocation(userId: string): void {
  locationStore.delete(userId);
}

export function getNearbyUserCount(location: GeoLocation, excludeUserId?: string): number {
  const cell = calculateGeoCell(location);
  const adjacentCells = getAdjacentCells(cell);
  return getUsersInCells(adjacentCells, excludeUserId).length;
}

export function calculateDistance(a: GeoLocation, b: GeoLocation): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
