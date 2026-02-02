import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
} from '@mui/material';
import {
  MenuBook as BooksIcon,
  School as StudentsIcon,
  SwapHoriz as LoansIcon,
  Warning as OverdueIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';
import { Statistics } from '../types';

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            {value}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {title}
          </Typography>
        </Box>
        <Box
          sx={{
            backgroundColor: color,
            borderRadius: '50%',
            p: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {React.cloneElement(icon as React.ReactElement, { sx: { color: 'white', fontSize: 28 } })}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await window.electronAPI.reports.getStatistics();
        if (response.success) {
          setStats(response.data);
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {t('dashboard.title')}
      </Typography>
      <Typography variant="h6" color="textSecondary" gutterBottom>
        {t('dashboard.welcome')}, {user?.fullName}!
      </Typography>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title={t('dashboard.totalBooks')}
            value={stats?.totalBooks || 0}
            icon={<BooksIcon />}
            color="#1976d2"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title={t('dashboard.totalStudents')}
            value={stats?.totalStudents || 0}
            icon={<StudentsIcon />}
            color="#2e7d32"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title={t('dashboard.activeLoans')}
            value={stats?.activeLoans || 0}
            icon={<LoansIcon />}
            color="#ed6c02"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title={t('dashboard.overdueLoans')}
            value={stats?.overdueLoans || 0}
            icon={<OverdueIcon />}
            color="#d32f2f"
          />
        </Grid>
      </Grid>

      <Card sx={{ mt: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {t('dashboard.quickActions')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 2 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/loans/new')}
            >
              {t('dashboard.newLoan')}
            </Button>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => navigate('/books/new')}
            >
              {t('dashboard.newBook')}
            </Button>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => navigate('/students/new')}
            >
              {t('dashboard.newStudent')}
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('dashboard.loansThisMonth')}
              </Typography>
              <Typography variant="h3" color="primary">
                {stats?.totalLoansThisMonth || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;
