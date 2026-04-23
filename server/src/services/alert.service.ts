import { Incident, UserLocation, AlertPayload } from '../types';
import {
  calculateDistance,
  getAdjacentCells,
  calculateGeoCell,
  getUsersInCells,
} from './location.service';

export function findNearbyUsers(
  incident: Incident
): { user: UserLocation; distance: number }[] {
  const cell = calculateGeoCell(incident.location);
  const adjacentCells = getAdjacentCells(cell);
  const nearbyUsers = getUsersInCells(adjacentCells, incident.userId);

  return nearbyUsers
    .map((user) => ({
      user,
      distance: calculateDistance(incident.location, user.location),
    }))
    .sort((a, b) => a.distance - b.distance);
}

export function createAlertPayload(
  incident: Incident,
  distance: number
): AlertPayload {
  return {
    incident,
    distance: Math.round(distance * 100) / 100,
  };
}
