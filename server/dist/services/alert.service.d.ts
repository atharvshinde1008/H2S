import { Incident, UserLocation, AlertPayload } from '../types';
export declare function findNearbyUsers(incident: Incident): {
    user: UserLocation;
    distance: number;
}[];
export declare function createAlertPayload(incident: Incident, distance: number): AlertPayload;
