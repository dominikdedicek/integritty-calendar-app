import React from 'react';
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
          p: 4,
          textAlign: 'center',
          backgroundColor: 'background.paper',
        }}
      >
        <Skeleton variant="text" width="60%" height={60} sx={{ mx: 'auto' }} />
        <Skeleton variant="rounded" width={200} height={60} sx={{ mx: 'auto', my: 2 }} />
        <Skeleton variant="text" width="40%" height={40} sx={{ mx: 'auto' }} />
        <Skeleton variant="text" width="30%" height={30} sx={{ mx: 'auto' }} />
      </Paper>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: 4,
        textAlign: 'center',
        backgroundColor: isOccupied ? 'error.dark' : 'success.dark',
        color: 'white',
        transition: 'background-color 0.3s ease',
      }}
    >
      {/* Room Name */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 2 }}>
        <RoomIcon sx={{ fontSize: 32 }} />
        <Typography variant="h2" component="h1">
          {roomName}
        </Typography>
      </Box>

      {/* Status Badge */}
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
        <Typography variant="h3" sx={{ mt: 3 }}>
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
        <Typography variant="h4" sx={{ mt: 3, opacity: 0.9 }}>
          Dnes bez dalších událostí
        </Typography>
      )}

      {/* Current date and time */}
      <Box sx={{ mt: 4, pt: 2, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
        <Typography variant="h4" sx={{ textTransform: 'capitalize' }}>
          {formatCurrentDate(now)}
        </Typography>
        <Typography
          variant="h2"
          sx={{ fontFamily: 'monospace', fontWeight: 700, mt: 1 }}
        >
          {formatCurrentTime(now)}
        </Typography>
      </Box>
    </Paper>
  );
}
