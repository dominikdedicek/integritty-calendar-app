import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  Chip,
  Skeleton,
  Divider,
} from '@mui/material';
import {
  Event as EventIcon,
  Person as PersonIcon,
  AccessTime as TimeIcon,
  FreeBreakfast as FreeIcon,
} from '@mui/icons-material';
import { CalendarEvent } from '../types';
import { formatTimeRange, isEventCurrent, isEventPast } from '../utils/time';
import { useClock } from '../hooks/useClock';
import { differenceInMinutes } from 'date-fns';

interface EventListProps {
  events: CalendarEvent[];
  loading?: boolean;
}

interface EventItemProps {
  event: CalendarEvent;
  isCurrent: boolean;
  isPast: boolean;
}

function EventItem({ event, isCurrent, isPast }: EventItemProps) {
  return (
    <ListItem
      sx={{
        borderRadius: 2,
        mb: 1,
        backgroundColor: isCurrent
          ? 'error.dark'
          : isPast
            ? 'action.disabledBackground'
            : 'background.paper',
        opacity: isPast ? 0.6 : 1,
        transition: 'all 0.3s ease',
        border: isCurrent ? '2px solid' : 'none',
        borderColor: isCurrent ? 'error.main' : 'transparent',
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Time */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 120 }}>
            <TimeIcon sx={{ fontSize: 18, opacity: 0.7 }} />
            <Typography
              variant="body1"
              sx={{ fontFamily: 'monospace', fontWeight: 600 }}
            >
              {event.isAllDay ? 'Celý den' : formatTimeRange(event.start, event.end)}
            </Typography>
          </Box>

          {/* Title and badges */}
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h4" sx={{ fontWeight: 500 }}>
                {event.title}
              </Typography>
              {isCurrent && (
                <Chip
                  label="NYNI"
                  size="small"
                  color="error"
                  sx={{ fontWeight: 700 }}
                />
              )}
            </Box>

            {/* Organizer */}
            {event.organizer && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                <PersonIcon sx={{ fontSize: 16, opacity: 0.7 }} />
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  {event.organizer}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </ListItem>
  );
}

function EventListSkeleton() {
  return (
    <List sx={{ p: 0 }}>
      {[1, 2, 3].map((i) => (
        <ListItem key={i} sx={{ mb: 1 }}>
          <Box sx={{ width: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Skeleton variant="text" width={100} height={24} />
              <Skeleton variant="text" width="60%" height={32} />
            </Box>
            <Skeleton variant="text" width="40%" height={20} sx={{ ml: 14 }} />
          </Box>
        </ListItem>
      ))}
    </List>
  );
}

function FreeTimeIndicator({ minutes }: { minutes: number }) {
  const formatFreeTime = (mins: number): string => {
    if (mins < 60) {
      return `${mins} min`;
    }
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    if (remainingMins === 0) {
      return `${hours} hod`;
    }
    return `${hours} hod ${remainingMins} min`;
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        py: 1,
        my: 0.5,
        borderRadius: 1,
        backgroundColor: 'success.dark',
        opacity: 0.8,
      }}
    >
      <FreeIcon sx={{ fontSize: 18 }} />
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        volno {formatFreeTime(minutes)}
      </Typography>
    </Box>
  );
}

function EmptyState() {
  return (
    <Box
      sx={{
        textAlign: 'center',
        py: 8,
        px: 4,
      }}
    >
      <EventIcon sx={{ fontSize: 64, opacity: 0.3, mb: 2 }} />
      <Typography variant="h4" sx={{ opacity: 0.7 }}>
        Dnes bez událostí
      </Typography>
      <Typography variant="body1" sx={{ opacity: 0.5, mt: 1 }}>
        Místnost je volná celý den
      </Typography>
    </Box>
  );
}

export function EventList({ events, loading }: EventListProps) {
  const now = useClock();

  if (loading) {
    return (
      <Paper elevation={0} sx={{ p: 3, backgroundColor: 'background.paper' }}>
        <Typography variant="h3" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <EventIcon /> Dnešní události
        </Typography>
        <EventListSkeleton />
      </Paper>
    );
  }

  if (events.length === 0) {
    return (
      <Paper elevation={0} sx={{ p: 3, backgroundColor: 'background.paper' }}>
        <Typography variant="h3" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <EventIcon /> Dnešní události
        </Typography>
        <EmptyState />
      </Paper>
    );
  }

  // Filter out past events (keep only current and future)
  // Sort events by start time
  const activeEvents = [...events]
    .filter((event) => !isEventPast(event.end, now) || isEventCurrent(event.start, event.end, now))
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  if (activeEvents.length === 0) {
    return (
      <Paper elevation={0} sx={{ p: 3, backgroundColor: 'background.paper' }}>
        <Typography variant="h3" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <EventIcon /> Dnešní události
        </Typography>
        <EmptyState />
      </Paper>
    );
  }

  // Calculate gaps between events
  const renderEventsWithGaps = () => {
    const elements: React.ReactNode[] = [];

    activeEvents.forEach((event, index) => {
      // Add event
      elements.push(
        <EventItem
          key={event.id}
          event={event}
          isCurrent={isEventCurrent(event.start, event.end, now)}
          isPast={false}
        />
      );

      // Check if there's a gap to the next event
      if (index < activeEvents.length - 1) {
        const currentEventEnd = new Date(event.end);
        const nextEventStart = new Date(activeEvents[index + 1].start);
        const gapMinutes = differenceInMinutes(nextEventStart, currentEventEnd);

        // Only show gap if it's at least 5 minutes
        if (gapMinutes >= 5) {
          elements.push(
            <FreeTimeIndicator key={`gap-${event.id}`} minutes={gapMinutes} />
          );
        }
      }
    });

    return elements;
  };

  return (
    <Paper elevation={0} sx={{ p: 3, backgroundColor: 'background.paper' }}>
      <Typography variant="h3" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <EventIcon /> Nadcházející události ({activeEvents.length})
      </Typography>
      <Divider sx={{ mb: 2 }} />
      <List sx={{ p: 0 }}>
        {renderEventsWithGaps()}
      </List>
    </Paper>
  );
}
