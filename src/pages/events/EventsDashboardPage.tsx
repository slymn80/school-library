import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Paper,
  Grid,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Event as EventIcon,
  Upcoming as UpcomingIcon,
  History as HistoryIcon,
  CalendarMonth as CalendarMonthIcon,
} from '@mui/icons-material';
import { LibraryEvent } from '../../types';

const EventsDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const [events, setEvents] = useState<LibraryEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
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
    fetchEvents();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const totalEvents = events.length;
  const upcomingEvents = events.filter((e) => new Date(e.eventDate) >= today).length;
  const pastEvents = events.filter((e) => new Date(e.eventDate) < today).length;

  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const thisMonthEvents = events.filter((e) => {
    const d = new Date(e.eventDate);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).length;

  const recentEvents = [...events]
    .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime())
    .slice(0, 5);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  const statCards = [
    { label: t('events.totalEvents'), value: totalEvents, icon: <EventIcon sx={{ fontSize: 40 }} />, color: '#2e7d32' },
    { label: t('events.upcomingEvents'), value: upcomingEvents, icon: <UpcomingIcon sx={{ fontSize: 40 }} />, color: '#1565c0' },
    { label: t('events.pastEvents'), value: pastEvents, icon: <HistoryIcon sx={{ fontSize: 40 }} />, color: '#e65100' },
    { label: t('events.thisMonth'), value: thisMonthEvents, icon: <CalendarMonthIcon sx={{ fontSize: 40 }} />, color: '#6a1b9a' },
  ];

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>{t('events.dashboard')}</Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statCards.map((card) => (
          <Grid item xs={12} sm={6} md={3} key={card.label}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Box sx={{ color: card.color, mb: 1 }}>{card.icon}</Box>
              <Typography variant="h3" sx={{ fontWeight: 'bold', color: card.color }}>
                {card.value}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {card.label}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>{t('events.recentEvents')}</Typography>
        {recentEvents.length === 0 ? (
          <Typography color="text.secondary">{t('events.noEvents')}</Typography>
        ) : (
          <List>
            {recentEvents.map((event, index) => (
              <React.Fragment key={event.id}>
                {index > 0 && <Divider />}
                <ListItem>
                  <ListItemText
                    primary={event.title}
                    secondary={`${formatDate(event.eventDate)}${event.eventTime ? ` - ${event.eventTime}` : ''}${event.topic ? ` | ${event.topic}` : ''}`}
                  />
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
};

export default EventsDashboardPage;
