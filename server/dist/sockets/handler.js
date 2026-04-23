"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSocketHandlers = setupSocketHandlers;
const incidentService = __importStar(require("../services/incident.service"));
const locationService = __importStar(require("../services/location.service"));
const alertService = __importStar(require("../services/alert.service"));
const rooms_1 = require("./rooms");
function setupSocketHandlers(io) {
    io.on('connection', (socket) => {
        const userId = socket.data.userId;
        const userName = socket.data.userName;
        console.log(`🔌 User connected: ${userName} (${userId})`);
        // Join personal room for direct messages
        socket.join(userId);
        // ─── SOS Events ─────────────────────────────────────
        socket.on('sos:trigger', (payload) => {
            console.log(`🚨 SOS triggered by ${userName}: ${payload.type}`);
            const incident = incidentService.createIncident(userId, userName, payload.type, payload.location, payload.description);
            // Update location & join geo rooms
            locationService.updateUserLocation(userId, userName, payload.location);
            (0, rooms_1.joinGeoRooms)(socket, payload.location);
            // Find and alert nearby users
            const nearbyUsers = alertService.findNearbyUsers(incident);
            console.log(`📢 Alerting ${nearbyUsers.length} nearby users`);
            // Broadcast to geo rooms
            const rooms = (0, rooms_1.getGeoRoomsForLocation)(payload.location);
            for (const room of rooms) {
                socket.to(room).emit('alert:nearby', alertService.createAlertPayload(incident, 0));
            }
            // Send individual alerts with distance
            for (const { user, distance } of nearbyUsers) {
                io.to(user.userId).emit('alert:nearby', alertService.createAlertPayload(incident, distance));
            }
            // Confirm to sender
            socket.emit('sos:confirmed', incident);
            // Broadcast new incident to all connected clients for map
            io.emit('incident:created', incident);
        });
        socket.on('sos:cancel', (data) => {
            console.log(`❌ SOS cancelled by ${userName}`);
            const incident = incidentService.resolveIncident(data.incidentId);
            if (incident) {
                io.emit('incident:updated', incident);
                socket.emit('sos:cancelled', incident);
            }
        });
        socket.on('sos:respond', (payload) => {
            console.log(`🙋 ${userName} responding to incident ${payload.incidentId}`);
            const incident = incidentService.addResponder(payload.incidentId, userId);
            if (incident) {
                // Notify the victim
                io.to(incident.userId).emit('sos:responder_joined', {
                    incident,
                    responder: { userId, userName },
                });
                // Broadcast update to all
                io.emit('incident:updated', incident);
            }
        });
        // ─── Location Events ────────────────────────────────
        socket.on('location:update', (payload) => {
            locationService.updateUserLocation(userId, userName, payload.location);
            (0, rooms_1.joinGeoRooms)(socket, payload.location);
            // Broadcast to nearby users for live map
            const rooms = (0, rooms_1.getGeoRoomsForLocation)(payload.location);
            for (const room of rooms) {
                socket.to(room).emit('location:peer_update', {
                    userId,
                    userName,
                    location: payload.location,
                });
            }
        });
        // ─── Data Fetching ──────────────────────────────────
        socket.on('incidents:get_active', () => {
            const incidents = incidentService.getActiveIncidents();
            socket.emit('incidents:active_list', incidents);
        });
        socket.on('incidents:get_all', () => {
            const incidents = incidentService.getAllIncidents();
            socket.emit('incidents:all_list', incidents);
        });
        socket.on('locations:get_active', () => {
            const locations = locationService.getActiveLocations();
            socket.emit('locations:active_list', locations);
        });
        socket.on('nearby:count', (data) => {
            const count = locationService.getNearbyUserCount(data.location, userId);
            socket.emit('nearby:count_result', { count });
        });
        // ─── Disconnect ─────────────────────────────────────
        socket.on('disconnect', () => {
            console.log(`🔌 User disconnected: ${userName} (${userId})`);
            (0, rooms_1.cleanupUserRooms)(socket);
        });
    });
}
//# sourceMappingURL=handler.js.map