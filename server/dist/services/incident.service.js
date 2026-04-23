"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createIncident = createIncident;
exports.getIncident = getIncident;
exports.getActiveIncidents = getActiveIncidents;
exports.getAllIncidents = getAllIncidents;
exports.updateIncidentStatus = updateIncidentStatus;
exports.addResponder = addResponder;
exports.getUserActiveIncident = getUserActiveIncident;
exports.resolveIncident = resolveIncident;
const uuid_1 = require("uuid");
// In-memory incident store
const incidentStore = new Map();
function createIncident(userId, userName, type, location, description) {
    const incident = {
        id: (0, uuid_1.v4)(),
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
function getIncident(id) {
    return incidentStore.get(id);
}
function getActiveIncidents() {
    return Array.from(incidentStore.values()).filter((inc) => inc.status === 'active' || inc.status === 'responding');
}
function getAllIncidents() {
    return Array.from(incidentStore.values()).sort((a, b) => b.createdAt - a.createdAt);
}
function updateIncidentStatus(id, status) {
    const incident = incidentStore.get(id);
    if (incident) {
        incident.status = status;
        incident.updatedAt = Date.now();
    }
    return incident;
}
function addResponder(incidentId, responderId) {
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
function getUserActiveIncident(userId) {
    return Array.from(incidentStore.values()).find((inc) => inc.userId === userId &&
        (inc.status === 'active' || inc.status === 'responding'));
}
function resolveIncident(id) {
    return updateIncidentStatus(id, 'resolved');
}
//# sourceMappingURL=incident.service.js.map