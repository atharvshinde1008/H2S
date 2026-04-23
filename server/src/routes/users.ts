import { Router, Request, Response } from 'express';

const router = Router();

// In-memory user profiles for prototype
const userProfiles = new Map<string, any>();

router.get('/me', (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string;
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

router.patch('/me', (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string;
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

export default router;
