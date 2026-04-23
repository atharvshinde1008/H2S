import { Socket } from 'socket.io';
import {
  calculateGeoCell,
  getAdjacentCells,
} from '../services/location.service';
import { GeoLocation } from '../types';

// Track which geo rooms each user is in
const userRooms = new Map<string, Set<string>>();

export function joinGeoRooms(socket: Socket, location: GeoLocation): void {
  const userId = socket.data.userId;
  const cell = calculateGeoCell(location);
  const rooms = getAdjacentCells(cell);

  // Leave old rooms that aren't in the new set
  const oldRooms = userRooms.get(userId);
  if (oldRooms) {
    for (const room of oldRooms) {
      if (!rooms.includes(room)) {
        socket.leave(`geo:${room}`);
      }
    }
  }

  // Join new rooms
  const newRoomSet = new Set<string>();
  for (const room of rooms) {
    socket.join(`geo:${room}`);
    newRoomSet.add(room);
  }
  userRooms.set(userId, newRoomSet);
}

export function getGeoRoomsForLocation(location: GeoLocation): string[] {
  const cell = calculateGeoCell(location);
  return getAdjacentCells(cell).map((c) => `geo:${c}`);
}

export function cleanupUserRooms(socket: Socket): void {
  const userId = socket.data.userId;
  const rooms = userRooms.get(userId);
  if (rooms) {
    for (const room of rooms) {
      socket.leave(`geo:${room}`);
    }
    userRooms.delete(userId);
  }
}
