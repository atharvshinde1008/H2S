import { Incident, IncidentType, IncidentStatus, GeoLocation } from '../types';
export declare function createIncident(userId: string, userName: string, type: IncidentType, location: GeoLocation, description?: string): Incident;
export declare function getIncident(id: string): Incident | undefined;
export declare function getActiveIncidents(): Incident[];
export declare function getAllIncidents(): Incident[];
export declare function updateIncidentStatus(id: string, status: IncidentStatus): Incident | undefined;
export declare function addResponder(incidentId: string, responderId: string): Incident | undefined;
export declare function getUserActiveIncident(userId: string): Incident | undefined;
export declare function resolveIncident(id: string): Incident | undefined;
