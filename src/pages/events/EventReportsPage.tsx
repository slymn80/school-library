import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Grid,
  CircularProgress,
} from '@mui/material';
import {
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
} from '@mui/icons-material';
import { LibraryEvent, Settings } from '../../types';
import { exportEventsListPdf, exportEventsToExcel } from '../../utils/export';

const EventReportsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [events, setEvents] = useState<LibraryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [eventsRes, settingsRes] = await Promise.all([
          window.electronAPI.libraryEvents.getAll(),
          window.electronAPI.settings.get(),
        ]);
        if (eventsRes.success) {
          setEvents(eventsRes.data);
        }
        if (settingsRes.success && settingsRes.data) {
          setSettings(settingsRes.data);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getFilteredEvents = () => {
    let filtered = [...events];
    if (dateFrom) {
      filtered = filtered.filter((e) => new Date(e.eventDate) >= new Date(dateFrom));
    }
    if (dateTo) {
      filtered = filtered.filter((e) => new Date(e.eventDate) <= new Date(dateTo));
    }
    return filtered;
  };

  const handleExportPdf = async () => {
    const filtered = getFilteredEvents();
    await exportEventsListPdf(filtered, settings, t, i18n.language);
  };

  const handleExportExcel = async () => {
    const filtered = getFilteredEvents();
    await exportEventsToExcel(filtered, t);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  const filteredCount = getFilteredEvents().length;

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>{t('events.reports')}</Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>{t('events.dateRange')}</Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              label={t('events.filterByDate')}
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label={t('events.filterByDate')}
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="body2" color="text.secondary">
              {t('events.totalEvents')}: {filteredCount}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <PdfIcon sx={{ fontSize: 48, color: '#d32f2f', mb: 2 }} />
            <Typography variant="h6" sx={{ mb: 1 }}>{t('events.eventsList')}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t('events.exportPdf')}
            </Typography>
            <Button
              variant="contained"
              startIcon={<PdfIcon />}
              onClick={handleExportPdf}
              sx={{ backgroundColor: '#d32f2f', '&:hover': { backgroundColor: '#b71c1c' } }}
            >
              {t('events.exportPdf')}
            </Button>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <ExcelIcon sx={{ fontSize: 48, color: '#2e7d32', mb: 2 }} />
            <Typography variant="h6" sx={{ mb: 1 }}>{t('events.eventsList')}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t('events.exportExcel')}
            </Typography>
            <Button
              variant="contained"
              startIcon={<ExcelIcon />}
              onClick={handleExportExcel}
              sx={{ backgroundColor: '#2e7d32', '&:hover': { backgroundColor: '#1b5e20' } }}
            >
              {t('events.exportExcel')}
            </Button>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default EventReportsPage;
