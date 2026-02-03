import {
  Box,
  Typography,
  Chip,
  Paper,
  Skeleton,
} from '@mui/material';
import {
  MeetingRoom as RoomIcon,
  CheckCircle as AvailableIcon,
  Cancel as OccupiedIcon,
} from '@mui/icons-material';
import { RoomStatus } from '../types';
import { formatCountdown, formatCurrentDate, formatCurrentTime } from '../utils/time';
import { useClock } from '../hooks/useClock';

interface StatusHeaderProps {
  roomName: string;
  status: RoomStatus | null;
  loading?: boolean;
}

export function StatusHeader({ roomName, status, loading }: StatusHeaderProps) {
  const now = useClock();

  // Calculate live countdowns
  const getCountdown = (): string | null => {
    if (!status) return null;

    if (status.isOccupied && status.currentEvent) {
      const endTime = new Date(status.currentEvent.end).getTime();
      const remaining = endTime - now.getTime();
      return remaining > 0 ? formatCountdown(remaining) : null;
    }

    if (!status.isOccupied && status.nextEvent) {
      const startTime = new Date(status.nextEvent.start).getTime();
      const remaining = startTime - now.getTime();
      return remaining > 0 ? formatCountdown(remaining) : null;
    }

    return null;
  };

  const countdown = getCountdown();
  const isOccupied = status?.isOccupied ?? false;

  if (loading) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 3,
          backgroundColor: 'background.paper',
        }}
      >
        <Skeleton variant="text" width="60%" height={60} sx={{ mx: 'auto' }} />
        <Skeleton variant="rounded" width={200} height={60} sx={{ mx: 'auto', my: 2 }} />
      </Paper>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        position: 'relative',
        backgroundColor: isOccupied ? 'error.dark' : 'success.dark',
        color: 'white',
        transition: 'background-color 0.3s ease',
      }}
    >
      {/* Date and Time - Top Right */}
      <Box
        sx={{
          position: 'absolute',
          top: 16,
          right: 24,
          textAlign: 'right',
        }}
      >
        <Typography variant="body2" sx={{ opacity: 0.9, textTransform: 'capitalize' }}>
          {formatCurrentDate(now)}
        </Typography>
        <Typography
          variant="h4"
          sx={{ fontFamily: 'monospace', fontWeight: 700 }}
        >
          {formatCurrentTime(now)}
        </Typography>
      </Box>

      {/* Room Name */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 2 }}>
        <RoomIcon sx={{ fontSize: 32 }} />
        <Typography variant="h2" component="h1">
          {roomName}
        </Typography>
      </Box>

      {/* Status Badge */}
      <Box sx={{ textAlign: 'center' }}>
        <Chip
          icon={isOccupied ? <OccupiedIcon /> : <AvailableIcon />}
          label={isOccupied ? 'OBSAZENO' : 'VOLNO'}
          sx={{
            fontSize: '2rem',
            fontWeight: 700,
            py: 4,
            px: 3,
            height: 'auto',
            '& .MuiChip-label': {
              px: 2,
            },
            '& .MuiChip-icon': {
              fontSize: '2rem',
            },
            backgroundColor: isOccupied ? 'error.main' : 'success.main',
            color: 'white',
          }}
        />

        {/* Countdown */}
        {countdown && (
          <Typography variant="h4" sx={{ mt: 2 }}>
            {isOccupied ? 'Konec za' : 'Další událost za'}{' '}
            <Box component="span" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
              {countdown}
            </Box>
          </Typography>
        )}

        {/* Current event info */}
        {status?.isOccupied && status.currentEvent && (
          <Typography variant="body1" sx={{ mt: 1, opacity: 0.9 }}>
            {status.currentEvent.title}
          </Typography>
        )}

        {/* Next event info when available */}
        {!status?.isOccupied && !status?.nextEvent && (
          <Typography variant="body1" sx={{ mt: 2, opacity: 0.9 }}>
            Dnes bez dalších událostí
          </Typography>
        )}
      </Box>
    </Paper>
  );
}
