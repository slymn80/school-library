import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Visibility as ViewIcon } from '@mui/icons-material';
import { LibraryEvent } from '../../types';

const PastEventsPage: React.FC = () => {
  const { t } = useTranslation();
  const [events, setEvents] = useState<LibraryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<LibraryEvent | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await window.electronAPI.libraryEvents.getAll();
        if (response.success) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const past = response.data.filter((e: LibraryEvent) => new Date(e.eventDate) < today);
          setEvents(past);
        }
      } catch (error) {
        console.error('Failed to fetch events:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  const handleOpenView = (event: LibraryEvent) => {
    setSelectedEvent(event);
    setViewDialogOpen(true);
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  const columns: GridColDef[] = [
    { field: 'title', headerName: t('events.eventTitle'), flex: 1, minWidth: 200 },
    { field: 'topic', headerName: t('events.topic'), flex: 1, minWidth: 150 },
    {
      field: 'eventDate',
      headerName: t('events.eventDate'),
      width: 120,
      valueGetter: (params: any) => formatDate(params.row.eventDate),
    },
    { field: 'eventTime', headerName: t('events.eventTime'), width: 100 },
    { field: 'participants', headerName: t('events.participants'), flex: 1, minWidth: 150 },
    {
      field: 'actions',
      headerName: t('common.actions'),
      width: 80,
      sortable: false,
      renderCell: (params) => (
        <Tooltip title={t('events.viewEvent')}>
          <IconButton size="small" onClick={() => handleOpenView(params.row)}>
            <ViewIcon />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>{t('events.pastEvents')}</Typography>

      <Paper sx={{ height: 600 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
          </Box>
        ) : events.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Typography color="text.secondary">{t('events.noEvents')}</Typography>
          </Box>
        ) : (
          <DataGrid
            rows={events}
            columns={columns}
            pageSizeOptions={[10, 25, 50]}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            disableRowSelectionOnClick
          />
        )}
      </Paper>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{t('events.viewEvent')}</DialogTitle>
        <DialogContent>
          {selectedEvent && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">{t('events.eventTitle')}</Typography>
                <Typography variant="body1">{selectedEvent.title}</Typography>
              </Box>
              {selectedEvent.topic && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">{t('events.topic')}</Typography>
                  <Typography variant="body1">{selectedEvent.topic}</Typography>
                </Box>
              )}
              <Box sx={{ display: 'flex', gap: 4 }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">{t('events.eventDate')}</Typography>
                  <Typography variant="body1">{formatDate(selectedEvent.eventDate)}</Typography>
                </Box>
                {selectedEvent.eventTime && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">{t('events.eventTime')}</Typography>
                    <Typography variant="body1">{selectedEvent.eventTime}</Typography>
                  </Box>
                )}
              </Box>
              {selectedEvent.participants && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">{t('events.participants')}</Typography>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{selectedEvent.participants}</Typography>
                </Box>
              )}
              {selectedEvent.content && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">{t('events.content')}</Typography>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{selectedEvent.content}</Typography>
                </Box>
              )}
              {selectedEvent.notes && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">{t('events.notes')}</Typography>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{selectedEvent.notes}</Typography>
                </Box>
              )}
              {selectedEvent.photo && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>{t('events.photo')}</Typography>
                  <Box
                    component="img"
                    src={selectedEvent.photo}
                    alt="Event photo"
                    sx={{ maxWidth: '100%', maxHeight: 400, objectFit: 'contain', borderRadius: 1, border: '1px solid #ddd' }}
                  />
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>{t('common.close')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PastEventsPage;
