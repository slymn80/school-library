import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  LocalShipping as DistributedIcon,
  AssignmentReturn as PendingIcon,
  Warning as MissingIcon,
  Inventory as StockIcon,
  Add as AddIcon,
  PictureAsPdf as PdfIcon,
} from '@mui/icons-material';
import { exportTextbookSummaryReportPdf } from '../../utils/export';

interface Statistics {
  totalDistributions: number;
  pendingReturns: number;
  completedReturns: number;
  totalMissingBooks: number;
  totalTextbookStock: number;
  availableTextbookStock: number;
}

interface Distribution {
  id: number;
  academicYear: string;
  distributedAt: string;
  status: string;
  branch: {
    name: string;
    grade: number;
    teacher?: { fullName: string };
  };
  set: { name: string };
}

const TextbookDashboardPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [recentDistributions, setRecentDistributions] = useState<Distribution[]>([]);
  const [academicYear, setAcademicYear] = useState('2025-2026');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch settings to get academic year
        const settingsResponse = await window.electronAPI.settings.get();
        if (settingsResponse.success && settingsResponse.data?.academicYear) {
          setAcademicYear(settingsResponse.data.academicYear);
        }

        // Fetch statistics
        const statsResponse = await window.electronAPI.textbookDistributions.getStatistics();
        if (statsResponse.success) {
          setStatistics(statsResponse.data);
        }

        // Fetch recent distributions
        const distResponse = await window.electronAPI.textbookDistributions.getAll();
        if (distResponse.success) {
          setRecentDistributions(distResponse.data.slice(0, 5));
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'distributed':
        return 'primary';
      case 'returned':
        return 'success';
      case 'partial':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'distributed':
        return t('textbookModule.distributed');
      case 'returned':
        return t('textbookModule.returned');
      case 'partial':
        return t('textbookModule.partial');
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">{t('textbookModule.dashboard')}</Typography>
        <Typography variant="subtitle1" color="text.secondary">
          {t('textbookModule.academicYear')}: {academicYear}
        </Typography>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <DistributedIcon sx={{ fontSize: 40, color: 'primary.main', mr: 1 }} />
                <Box>
                  <Typography variant="h4">{statistics?.totalDistributions || 0}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('textbookModule.totalDistributions')}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PendingIcon sx={{ fontSize: 40, color: 'warning.main', mr: 1 }} />
                <Box>
                  <Typography variant="h4">{statistics?.pendingReturns || 0}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('textbookModule.pendingReturns')}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <MissingIcon sx={{ fontSize: 40, color: 'error.main', mr: 1 }} />
                <Box>
                  <Typography variant="h4">{statistics?.totalMissingBooks || 0}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('textbookModule.missingBooks')}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <StockIcon sx={{ fontSize: 40, color: 'success.main', mr: 1 }} />
                <Box>
                  <Typography variant="h4">
                    {statistics?.availableTextbookStock || 0} / {statistics?.totalTextbookStock || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('textbookModule.availableStock')}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Paper sx={{ p: 2, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          {t('dashboard.quickActions')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/textbooks/distributions')}
          >
            {t('textbookModule.newDistribution')}
          </Button>
          <Button
            variant="outlined"
            onClick={() => navigate('/textbooks/books')}
          >
            {t('textbookModule.manageTextbooks')}
          </Button>
          <Button
            variant="outlined"
            onClick={() => navigate('/textbooks/sets')}
          >
            {t('textbookModule.manageSets')}
          </Button>
          <Button
            variant="outlined"
            startIcon={<PdfIcon />}
            onClick={async () => {
              const settingsRes = await window.electronAPI.settings.get();
              const s = settingsRes.success ? settingsRes.data : null;
              await exportTextbookSummaryReportPdf(statistics, recentDistributions, academicYear, s, t, i18n.language);
            }}
          >
            {t('textbookModule.reports.printSummaryReport')}
          </Button>
        </Box>
      </Paper>

      {/* Recent Distributions */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          {t('textbookModule.recentDistributions')}
        </Typography>
        {recentDistributions.length === 0 ? (
          <Typography color="text.secondary">{t('common.noData')}</Typography>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('textbookModule.branch')}</TableCell>
                  <TableCell>{t('textbookModule.set')}</TableCell>
                  <TableCell>{t('textbookModule.teacher')}</TableCell>
                  <TableCell>{t('textbookModule.date')}</TableCell>
                  <TableCell>{t('textbookModule.status')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentDistributions.map((dist) => (
                  <TableRow key={dist.id}>
                    <TableCell>
                      {dist.branch.grade}. {t('textbookModule.grade')} - {dist.branch.name}
                    </TableCell>
                    <TableCell>{dist.set.name}</TableCell>
                    <TableCell>{dist.branch.teacher?.fullName || '-'}</TableCell>
                    <TableCell>
                      {new Date(dist.distributedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(dist.status)}
                        color={getStatusColor(dist.status)}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
};

export default TextbookDashboardPage;
