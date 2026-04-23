"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateGeoCell = calculateGeoCell;
exports.getAdjacentCells = getAdjacentCells;
exports.updateUserLocation = updateUserLocation;
exports.getUserLocation = getUserLocation;
exports.getActiveLocations = getActiveLocations;
exports.getUsersInCells = getUsersInCells;
exports.removeUserLocation = removeUserLocation;
exports.getNearbyUserCount = getNearbyUserCount;
exports.calculateDistance = calculateDistance;
// In-memory location store (swap for Firestore later)
const locationStore = new Map();
// ~1.1km grid cells at equator
const CELL_SIZE = 0.01;
function calculateGeoCell(location) {
    const latCell = Math.floor(location.lat / CELL_SIZE);
    const lngCell = Math.floor(location.lng / CELL_SIZE);
    return `${latCell}:${lngCell}`;
}
function getAdjacentCells(cell) {
    const [lat, lng] = cell.split(':').map(Number);
    const cells = [];
    for (let dLat = -1; dLat <= 1; dLat++) {
        for (let dLng = -1; dLng <= 1; dLng++) {
            cells.push(`${lat + dLat}:${lng + dLng}`);
        }
    }
    return cells;
}
function updateUserLocation(userId, userName, location) {
    const geoCell = calculateGeoCell(location);
    const userLocation = {
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
function getUserLocation(userId) {
    return locationStore.get(userId);
}
function getActiveLocations() {
    const now = Date.now();
    const TEN_MINUTES = 10 * 60 * 1000;
    const active = [];
    for (const [, loc] of locationStore) {
        if (now - loc.lastUpdated < TEN_MINUTES) {
            active.push(loc);
        }
        else {
            loc.isActive = false;
        }
    }
    return active;
}
function getUsersInCells(cells, excludeUserId) {
    const cellSet = new Set(cells);
    const users = [];
    const now = Date.now();
    const TEN_MINUTES = 10 * 60 * 1000;
    for (const [, loc] of locationStore) {
        if (cellSet.has(loc.geoCell) &&
            loc.isActive &&
            loc.userId !== excludeUserId &&
            now - loc.lastUpdated < TEN_MINUTES) {
            users.push(loc);
        }
    }
    return users;
}
function removeUserLocation(userId) {
    locationStore.delete(userId);
}
function getNearbyUserCount(location, excludeUserId) {
    const cell = calculateGeoCell(location);
    const adjacentCells = getAdjacentCells(cell);
    return getUsersInCells(adjacentCells, excludeUserId).length;
}
function calculateDistance(a, b) {
    const R = 6371;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const x = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
    return R * c;
}
function toRad(deg) {
    return (deg * Math.PI) / 180;
}
//# sourceMappingURL=location.service.js.map