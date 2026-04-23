import { v4 as uuidv4 } from 'uuid';
import { Incident, IncidentType, IncidentStatus, GeoLocation } from '../types';

// In-memory incident store
const incidentStore = new Map<string, Incident>();

export function createIncident(
  userId: string,
  userName: string,
  type: IncidentType,
  location: GeoLocation,
  description?: string
): Incident {
  const incident: Incident = {
    id: uuidv4(),
    userId,
    userName,
    type,
    status: 'active',
    location,
    description,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    responders: [],
  };
  incidentStore.set(incident.id, incident);
  return incident;
}

export function getIncident(id: string): Incident | undefined {
  return incidentStore.get(id);
}

export function getActiveIncidents(): Incident[] {
  return Array.from(incidentStore.values()).filter(
    (inc) => inc.status === 'active' || inc.status === 'responding'
  );
}

export function getAllIncidents(): Incident[] {
  return Array.from(incidentStore.values()).sort(
    (a, b) => b.createdAt - a.createdAt
  );
}

export function updateIncidentStatus(
  id: string,
  status: IncidentStatus
): Incident | undefined {
  const incident = incidentStore.get(id);
  if (incident) {
    incident.status = status;
    incident.updatedAt = Date.now();
  }
  return incident;
}

export function addResponder(
  incidentId: string,
  responderId: string
): Incident | undefined {
  const incident = incidentStore.get(incidentId);
  if (incident && !incident.responders.includes(responderId)) {
    incident.responders.push(responderId);
    if (incident.status === 'active') {
      incident.status = 'responding';
    }
    incident.updatedAt = Date.now();
  }
  return incident;
}

export function getUserActiveIncident(userId: string): Incident | undefined {
  return Array.from(incidentStore.values()).find(
    (inc) =>
      inc.userId === userId &&
      (inc.status === 'active' || inc.status === 'responding')
  );
}

export function resolveIncident(id: string): Incident | undefined {
  return updateIncidentStatus(id, 'resolved');
}
