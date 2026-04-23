"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findNearbyUsers = findNearbyUsers;
exports.createAlertPayload = createAlertPayload;
const location_service_1 = require("./location.service");
function findNearbyUsers(incident) {
    const cell = (0, location_service_1.calculateGeoCell)(incident.location);
    const adjacentCells = (0, location_service_1.getAdjacentCells)(cell);
    const nearbyUsers = (0, location_service_1.getUsersInCells)(adjacentCells, incident.userId);
    return nearbyUsers
        .map((user) => ({
        user,
        distance: (0, location_service_1.calculateDistance)(incident.location, user.location),
    }))
        .sort((a, b) => a.distance - b.distance);
}
function createAlertPayload(incident, distance) {
    return {
        incident,
        distance: Math.round(distance * 100) / 100,
    };
}
//# sourceMappingURL=alert.service.js.map