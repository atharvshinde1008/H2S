import { Socket } from 'socket.io';
import { GeoLocation } from '../types';
export declare function joinGeoRooms(socket: Socket, location: GeoLocation): void;
export declare function getGeoRoomsForLocation(location: GeoLocation): string[];
export declare function cleanupUserRooms(socket: Socket): void;
