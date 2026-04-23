export interface GeoLocation {
  lat: number;
  lng: number;
}

export type IncidentType = 'medical' | 'fire' | 'harassment' | 'accident' | 'other';
export type IncidentStatus = 'active' | 'responding' | 'resolved';

export interface Incident {
  id: string;
  userId: string;
  userName: string;
  type: IncidentType;
  status: IncidentStatus;
  location: GeoLocation;
  description?: string;
  createdAt: number;
  updatedAt: number;
  responders: string[];
}

export interface UserLocation {
  userId: string;
  userName: string;
  location: GeoLocation;
  geoCell: string;
  isActive: boolean;
  lastUpdated: number;
}

export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  phone: string;
  emergencyContacts: EmergencyContact[];
  isVolunteer: boolean;
  trustRating: number;
  totalRescues: number;
  createdAt: number;
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export interface SOSTriggerPayload {
  type: IncidentType;
  location: GeoLocation;
  description?: string;
}

export interface SOSResponsePayload {
  incidentId: string;
}

export interface LocationUpdatePayload {
  location: GeoLocation;
}

export interface AlertPayload {
  incident: Incident;
  distance: number;
  severityScore?: number;
}
