"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
// In-memory user profiles for prototype
const userProfiles = new Map();
router.get('/me', (req, res) => {
    const userId = req.headers['x-user-id'];
    if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    const profile = userProfiles.get(userId) || {
        id: userId,
        displayName: 'User',
        email: '',
        phone: '',
        emergencyContacts: [],
        isVolunteer: false,
        trustRating: 5.0,
        totalRescues: 0,
    };
    res.json({ profile });
});
router.patch('/me', (req, res) => {
    const userId = req.headers['x-user-id'];
    if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    const existing = userProfiles.get(userId) || {
        id: userId,
        displayName: 'User',
        email: '',
        phone: '',
        emergencyContacts: [],
        isVolunteer: false,
        trustRating: 5.0,
        totalRescues: 0,
    };
    const updated = { ...existing, ...req.body };
    userProfiles.set(userId, updated);
    res.json({ profile: updated });
});
exports.default = router;
//# sourceMappingURL=users.js.map