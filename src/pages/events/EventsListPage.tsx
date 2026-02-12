import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Button,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Snackbar,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../../store/authStore';
import { LibraryEvent, Settings } from '../../types';
import { exportEventsListPdf, exportEventsToExcel } from '../../utils/export';

const EventsListPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();

  const [events, setEvents] = useState<LibraryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<LibraryEvent | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [participants, setParticipants] = useState('');
  const [content, setContent] = useState('');
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);

  // Snackbar
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await window.electronAPI.libraryEvents.getAll();
      if (response.success) {
        setEvents(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    const fetchSettings = async () => {
      try {
        const response = await window.electronAPI.settings.get();
        if (response.success && response.data) {
          setSettings(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error);
      }
    };
    fetchSettings();
  }, []);

  const resetForm = () => {
    setTitle('');
    setTopic('');
    setEventDate('');
    setEventTime('');
    setParticipants('');
    setContent('');
    setNotes('');
    setPhoto(null);
    setSelectedEvent(null);
    setEditMode(false);
  };

  const handleOpenAdd = () => {
    resetForm();
    setFormDialogOpen(true);
  };

  const handleOpenEdit = (event: LibraryEvent) => {
    setSelectedEvent(event);
    setEditMode(true);
    setTitle(event.title);
    setTopic(event.topic || '');
    setEventDate(event.eventDate ? new Date(event.eventDate).toISOString().split('T')[0] : '');
    setEventTime(event.eventTime || '');
    setParticipants(event.participants || '');
    setContent(event.content || '');
    setNotes(event.notes || '');
    setPhoto(event.photo || null);
    setFormDialogOpen(true);
  };

  const handleOpenView = (event: LibraryEvent) => {
    setSelectedEvent(event);
    setViewDialogOpen(true);
  };

  const handleOpenDelete = (event: LibraryEvent) => {
    setSelectedEvent(event);
    setDeleteDialogOpen(true);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setSnackbar({ open: true, message: t('books.imageTooLarge'), severity: 'error' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setPhoto(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !eventDate) return;

    const data = {
      title: title.trim(),
      topic: topic.trim() || null,
      eventDate,
      eventTime: eventTime.trim() || null,
      participants: participants.trim() || null,
      content: content.trim() || null,
      notes: notes.trim() || null,
      photo,
    };

    try {
      let response;
      if (editMode && selectedEvent) {
        response = await window.electronAPI.libraryEvents.update(selectedEvent.id, data, user!.id);
        if (response.success) {
          setSnackbar({ open: true, message: t('events.eventUpdated'), severity: 'success' });
        }
      } else {
        response = await window.electronAPI.libraryEvents.create(data, user!.id);
        if (response.success) {
          setSnackbar({ open: true, message: t('events.eventCreated'), severity: 'success' });
        }
      }

      if (response.success) {
        setFormDialogOpen(false);
        resetForm();
        fetchEvents();
      } else {
        setSnackbar({ open: true, message: t('errors.general'), severity: 'error' });
      }
    } catch (error) {
      console.error('Save event error:', error);
      setSnackbar({ open: true, message: t('errors.general'), severity: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!selectedEvent) return;

    try {
      const response = await window.electronAPI.libraryEvents.delete(selectedEvent.id, user!.id);
      if (response.success) {
        setSnackbar({ open: true, message: t('events.eventDeleted'), severity: 'success' });
        setDeleteDialogOpen(false);
        setSelectedEvent(null);
        fetchEvents();
      } else {
        setSnackbar({ open: true, message: t('errors.general'), severity: 'error' });
      }
    } catch (error) {
      console.error('Delete event error:', error);
      setSnackbar({ open: true, message: t('errors.general'), severity: 'error' });
    }
  };

  const handleExportPdf = async () => {
    await exportEventsListPdf(events, settings, t, i18n.language);
  };

  const handleExportExcel = async () => {
    await exportEventsToExcel(events, t);
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
      width: 150,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <Tooltip title={t('events.viewEvent')}>
            <IconButton size="small" onClick={() => handleOpenView(params.row)}>
              <ViewIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('common.edit')}>
            <IconButton size="small" onClick={() => handleOpenEdit(params.row)}>
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('common.delete')}>
            <IconButton size="small" color="error" onClick={() => handleOpenDelete(params.row)}>
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">{t('events.allEvents')}</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<PdfIcon />} onClick={handleExportPdf}>
            {t('events.exportPdf')}
          </Button>
          <Button variant="outlined" startIcon={<ExcelIcon />} onClick={handleExportExcel}>
            {t('events.exportExcel')}
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAdd} sx={{ backgroundColor: '#2e7d32', '&:hover': { backgroundColor: '#1b5e20' } }}>
            {t('events.addEvent')}
          </Button>
        </Box>
      </Box>

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

      {/* Add/Edit Dialog */}
      <Dialog open={formDialogOpen} onClose={() => setFormDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editMode ? t('events.editEvent') : t('events.addEvent')}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label={t('events.eventTitle')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              fullWidth
            />
            <TextField
              label={t('events.topic')}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              fullWidth
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label={t('events.eventDate')}
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                required
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label={t('events.eventTime')}
                type="time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Box>
            <TextField
              label={t('events.participants')}
              value={participants}
              onChange={(e) => setParticipants(e.target.value)}
              multiline
              rows={2}
              fullWidth
            />
            <TextField
              label={t('events.content')}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              multiline
              rows={3}
              fullWidth
            />
            <TextField
              label={t('events.notes')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              multiline
              rows={2}
              fullWidth
            />

            {/* Photo upload */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('events.photo')}</Typography>
              {photo ? (
                <Box sx={{ position: 'relative', display: 'inline-block' }}>
                  <Box
                    component="img"
                    src={photo}
                    alt="Event photo"
                    sx={{ maxWidth: 300, maxHeight: 200, objectFit: 'contain', borderRadius: 1, border: '1px solid #ddd' }}
                  />
                  <Button
                    size="small"
                    color="error"
                    onClick={() => setPhoto(null)}
                    sx={{ mt: 1, display: 'block' }}
                  >
                    {t('events.removePhoto')}
                  </Button>
                </Box>
              ) : (
                <Button variant="outlined" component="label">
                  {t('events.addPhoto')}
                  <input type="file" hidden accept="image/*" onChange={handlePhotoChange} />
                </Button>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!title.trim() || !eventDate}
          >
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>

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

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>{t('common.confirm')}</DialogTitle>
        <DialogContent>
          <Typography>{t('events.deleteConfirm')}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>
            {t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default EventsListPage;
