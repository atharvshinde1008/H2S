"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.joinGeoRooms = joinGeoRooms;
exports.getGeoRoomsForLocation = getGeoRoomsForLocation;
exports.cleanupUserRooms = cleanupUserRooms;
const location_service_1 = require("../services/location.service");
// Track which geo rooms each user is in
const userRooms = new Map();
function joinGeoRooms(socket, location) {
    const userId = socket.data.userId;
    const cell = (0, location_service_1.calculateGeoCell)(location);
    const rooms = (0, location_service_1.getAdjacentCells)(cell);
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
    const newRoomSet = new Set();
    for (const room of rooms) {
        socket.join(`geo:${room}`);
        newRoomSet.add(room);
    }
    userRooms.set(userId, newRoomSet);
}
function getGeoRoomsForLocation(location) {
    const cell = (0, location_service_1.calculateGeoCell)(location);
    return (0, location_service_1.getAdjacentCells)(cell).map((c) => `geo:${c}`);
}
function cleanupUserRooms(socket) {
    const userId = socket.data.userId;
    const rooms = userRooms.get(userId);
    if (rooms) {
        for (const room of rooms) {
            socket.leave(`geo:${room}`);
        }
        userRooms.delete(userId);
    }
}
//# sourceMappingURL=rooms.js.map