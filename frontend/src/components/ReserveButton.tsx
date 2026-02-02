import React from 'react';
import {
  Box,
  Button,
  Typography,
  Tooltip,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { RoomStatus } from '../types';
import { canMakeReservation } from '../utils/slots';

interface ReserveButtonProps {
  status: RoomStatus | null;
  onClick: () => void;
  disabled?: boolean;
}

export function ReserveButton({ status, onClick, disabled }: ReserveButtonProps) {
  const reservation = status
    ? canMakeReservation(status.isOccupied, status.nextEvent)
    : { canReserve: false, reason: 'Načítání...' };

  const isDisabled = disabled || !reservation.canReserve;

  const button = (
    <Button
      variant="contained"
      size="large"
      onClick={onClick}
      disabled={isDisabled}
      startIcon={<AddIcon />}
      sx={{
        py: 3,
        px: 6,
        fontSize: '1.5rem',
        fontWeight: 700,
        width: '100%',
        maxWidth: 400,
        backgroundColor: isDisabled ? 'action.disabledBackground' : 'primary.main',
        '&:hover': {
          backgroundColor: 'primary.dark',
        },
        '&.Mui-disabled': {
          color: 'text.disabled',
        },
      }}
    >
      REZERVOVAT
    </Button>
  );

  return (
    <Box
      sx={{
        p: 3,
        textAlign: 'center',
        backgroundColor: 'background.paper',
        borderTop: '1px solid',
        borderColor: 'divider',
      }}
    >
      {reservation.reason && !reservation.canReserve ? (
        <Tooltip title={reservation.reason} arrow placement="top">
          <span>{button}</span>
        </Tooltip>
      ) : (
        button
      )}

      {reservation.reason && !reservation.canReserve && (
        <Typography
          variant="body2"
          sx={{ mt: 1, color: 'text.secondary' }}
        >
          {reservation.reason}
        </Typography>
      )}
    </Box>
  );
}
