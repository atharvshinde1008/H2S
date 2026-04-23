import { Router, Request, Response } from 'express';
import * as incidentService from '../services/incident.service';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const incidents = incidentService.getActiveIncidents();
  res.json({ incidents });
});

router.get('/all', (_req: Request, res: Response) => {
  const incidents = incidentService.getAllIncidents();
  res.json({ incidents });
});

router.get('/:id', (req: Request, res: Response) => {
  const incident = incidentService.getIncident(req.params.id);
  if (!incident) {
    res.status(404).json({ error: 'Incident not found' });
    return;
  }
  res.json({ incident });
});

export default router;
