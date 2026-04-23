import { Server, Socket } from 'socket.io';
import { SOSTriggerPayload, SOSResponsePayload, LocationUpdatePayload } from '../types';
import * as incidentService from '../services/incident.service';
import * as locationService from '../services/location.service';
import * as alertService from '../services/alert.service';
import {
  joinGeoRooms,
  getGeoRoomsForLocation,
  cleanupUserRooms,
} from './rooms';

export function setupSocketHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId as string;
    const userName = socket.data.userName as string;

    console.log(`🔌 User connected: ${userName} (${userId})`);

    // Join personal room for direct messages
    socket.join(userId);

    // ─── SOS Events ─────────────────────────────────────

    socket.on('sos:trigger', (payload: SOSTriggerPayload) => {
      console.log(`🚨 SOS triggered by ${userName}: ${payload.type}`);

      const incident = incidentService.createIncident(
        userId,
        userName,
        payload.type,
        payload.location,
        payload.description
      );

      // Update location & join geo rooms
      locationService.updateUserLocation(userId, userName, payload.location);
      joinGeoRooms(socket, payload.location);

      // Find and alert nearby users
      const nearbyUsers = alertService.findNearbyUsers(incident);
      console.log(`📢 Alerting ${nearbyUsers.length} nearby users`);

      // Broadcast to geo rooms
      const rooms = getGeoRoomsForLocation(payload.location);
      for (const room of rooms) {
        socket.to(room).emit(
          'alert:nearby',
          alertService.createAlertPayload(incident, 0)
        );
      }

      // Send individual alerts with distance
      for (const { user, distance } of nearbyUsers) {
        io.to(user.userId).emit(
          'alert:nearby',
          alertService.createAlertPayload(incident, distance)
        );
      }

      // Confirm to sender
      socket.emit('sos:confirmed', incident);

      // Broadcast new incident to all connected clients for map
      io.emit('incident:created', incident);
    });

    socket.on('sos:cancel', (data: { incidentId: string }) => {
      console.log(`❌ SOS cancelled by ${userName}`);
      const incident = incidentService.resolveIncident(data.incidentId);
      if (incident) {
        io.emit('incident:updated', incident);
        socket.emit('sos:cancelled', incident);
      }
    });

    socket.on('sos:respond', (payload: SOSResponsePayload) => {
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

    socket.on('location:update', (payload: LocationUpdatePayload) => {
      locationService.updateUserLocation(userId, userName, payload.location);
      joinGeoRooms(socket, payload.location);

      // Broadcast to nearby users for live map
      const rooms = getGeoRoomsForLocation(payload.location);
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

    socket.on('nearby:count', (data: { location: { lat: number; lng: number } }) => {
      const count = locationService.getNearbyUserCount(data.location, userId);
      socket.emit('nearby:count_result', { count });
    });

    // ─── Disconnect ─────────────────────────────────────

    socket.on('disconnect', () => {
      console.log(`🔌 User disconnected: ${userName} (${userId})`);
      cleanupUserRooms(socket);
    });
  });
}
