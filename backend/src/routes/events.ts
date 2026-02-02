import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { parseISO, isBefore, isAfter, addMinutes } from 'date-fns';
import { getTodayEvents, checkCollision, createReservation } from '../services/googleCalendar';
import { config } from '../config';

const router = Router();

// GET /api/events - Get today's events and room status
router.get('/', async (_req: Request, res: Response) => {
  try {
    const data = await getTodayEvents();
    res.json(data);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({
      error: 'Failed to fetch events',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/events/config - Get room configuration
router.get('/config', (_req: Request, res: Response) => {
  res.json({
    roomName: config.roomName,
    timezone: config.timezone,
    refreshIntervalSeconds: config.refreshIntervalSeconds,
  });
});

// POST /api/events/reserve - Create a quick reservation
const reserveSchema = z.object({
  start: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid start date',
  }),
  end: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid end date',
  }),
  title: z.string().optional(),
});

router.post('/reserve', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validation = reserveSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid request',
        details: validation.error.issues,
      });
      return;
    }

    const { start: startStr, end: endStr, title } = validation.data;
    const start = parseISO(startStr);
    const end = parseISO(endStr);
    const now = new Date();

    // Validate time constraints
    if (isBefore(start, now)) {
      res.status(400).json({
        success: false,
        error: 'Čas začátku nemůže být v minulosti',
      });
      return;
    }

    if (!isAfter(end, start)) {
      res.status(400).json({
        success: false,
        error: 'Čas konce musí být po času začátku',
      });
      return;
    }

    // Maximum reservation duration: 60 minutes
    const maxEnd = addMinutes(start, 60);
    if (isAfter(end, maxEnd)) {
      res.status(400).json({
        success: false,
        error: 'Maximální délka rezervace je 60 minut',
      });
      return;
    }

    // Check for collisions (server-side validation)
    const collision = await checkCollision(start, end);
    if (collision) {
      res.status(409).json({
        success: false,
        error: 'Mezitím někdo zabral slot, zkus to znovu.',
        conflictingEvent: collision,
      });
      return;
    }

    // Create the reservation
    const event = await createReservation(start, end, title);

    res.status(201).json({
      success: true,
      event,
    });
  } catch (error) {
    console.error('Error creating reservation:', error);
    res.status(500).json({
      success: false,
      error: 'Nepodařilo se vytvořit rezervaci',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
