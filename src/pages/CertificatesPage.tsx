import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  CircularProgress,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  EmojiEvents as TrophyIcon,
  Print as PrintIcon,
  Save as SaveIcon,
  Search as SearchIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useAuthStore } from '../store/authStore';
import { Settings, CertificateAward } from '../types';
import {
  exportMonthlyStudentCertificatePdf,
  exportYearlyStudentCertificatePdf,
  exportMonthlyClassCertificatePdf,
  exportYearlyClassCertificatePdf,
} from '../utils/export';

interface TopStudent {
  id: number;
  fullName: string;
  grade: string;
  booksRead: number;
  rank: number;
}

interface TopClass {
  grade: string;
  booksRead: number;
  rank: number;
}

const CertificatesPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);

  // Monthly state
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedMonthYear, setSelectedMonthYear] = useState(new Date().getFullYear());

  // Yearly state
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Results
  const [topStudents, setTopStudents] = useState<TopStudent[]>([]);
  const [topClasses, setTopClasses] = useState<TopClass[]>([]);
  const [determined, setDetermined] = useState(false);

  // History
  const [history, setHistory] = useState<CertificateAward[]>([]);

  useEffect(() => {
    fetchSettings();
    fetchHistory();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await window.electronAPI.settings.get();
      if (response.success) {
        setSettings(response.data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await window.electronAPI.certificates.getHistory();
      if (response.success) {
        setHistory(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const getCurrentPeriod = (): string => {
    if (tabValue === 0) {
      return `${selectedMonthYear}-${String(selectedMonth).padStart(2, '0')}`;
    }
    return String(selectedYear);
  };

  const getCurrentType = (): 'monthly' | 'yearly' => {
    return tabValue === 0 ? 'monthly' : 'yearly';
  };

  const handleDetermine = async () => {
    setLoading(true);
    setDetermined(false);
    try {
      const period = getCurrentPeriod();
      const type = getCurrentType();

      const [studentsRes, classesRes] = await Promise.all([
        window.electronAPI.certificates.getTopStudents(period, type),
        window.electronAPI.certificates.getTopClasses(period, type),
      ]);

      if (studentsRes.success) {
        setTopStudents(studentsRes.data || []);
      }
      if (classesRes.success) {
        setTopClasses(classesRes.data || []);
      }

      if ((!studentsRes.data || studentsRes.data.length === 0) && (!classesRes.data || classesRes.data.length === 0)) {
        toast.info(t('certificates.noBooksRead'));
      }

      // Check if already finalized
      const existingAwards = history.filter(
        (h) => h.period === period && h.type === type
      );
      setDetermined(existingAwards.length > 0);
    } catch (error) {
      toast.error(t('errors.general'));
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async () => {
    if (topStudents.length === 0 && topClasses.length === 0) return;

    try {
      const period = getCurrentPeriod();
      const type = getCurrentType();

      const awards: any[] = [];

      topStudents.forEach((s) => {
        awards.push({
          category: 'student',
          rank: s.rank,
          awardee: s.fullName,
          awardeeId: s.id,
          grade: s.grade,
          booksRead: s.booksRead,
        });
      });

      topClasses.forEach((c) => {
        awards.push({
          category: 'class',
          rank: c.rank,
          awardee: c.grade,
          awardeeId: null,
          grade: c.grade,
          booksRead: c.booksRead,
        });
      });

      const response = await window.electronAPI.certificates.finalize(
        { type, period, awards },
        user!.id
      );

      if (response.success) {
        toast.success(t('certificates.finalizeSuccess'));
        setDetermined(true);
        fetchHistory();
      } else {
        toast.error(t('errors.general'));
      }
    } catch (error) {
      toast.error(t('errors.general'));
    }
  };

  const handleDeletePeriod = async (period: string, type: string) => {
    if (!window.confirm(t('certificates.deleteConfirm'))) return;

    try {
      const response = await window.electronAPI.certificates.delete(period, type, user!.id);
      if (response.success) {
        toast.success(t('certificates.deleteSuccess'));
        fetchHistory();
        // If we just deleted the current period, reset determined state
        if (period === getCurrentPeriod() && type === getCurrentType()) {
          setDetermined(false);
        }
      } else {
        toast.error(t('errors.general'));
      }
    } catch (error) {
      toast.error(t('errors.general'));
    }
  };

  const handlePrintStudentCerts = async () => {
    if (topStudents.length === 0) return;
    const awards = topStudents.map((s) => ({
      rank: s.rank,
      awardee: s.fullName,
      grade: s.grade,
      booksRead: s.booksRead,
      awardeeId: s.id,
    }));
    const period = getCurrentPeriod();
    if (tabValue === 0) {
      await exportMonthlyStudentCertificatePdf(awards, period, settings, t, i18n.language);
    } else {
      await exportYearlyStudentCertificatePdf(awards, period, settings, t, i18n.language);
    }
  };

  const handlePrintClassCerts = async () => {
    if (topClasses.length === 0) return;
    const awards = topClasses.map((c) => ({
      rank: c.rank,
      awardee: c.grade,
      booksRead: c.booksRead,
    }));
    const period = getCurrentPeriod();
    if (tabValue === 0) {
      await exportMonthlyClassCertificatePdf(awards, period, settings, t, i18n.language);
    } else {
      await exportYearlyClassCertificatePdf(awards, period, settings, t, i18n.language);
    }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  // Group history by period+type for display
  const historyGroups: { [key: string]: CertificateAward[] } = {};
  history.forEach((h) => {
    const key = `${h.period}_${h.type}`;
    if (!historyGroups[key]) historyGroups[key] = [];
    historyGroups[key].push(h);
  });

  const formatPeriodLabel = (period: string, type: string): string => {
    if (type === 'monthly' && period.includes('-')) {
      const [y, m] = period.split('-');
      return `${getMonthName(parseInt(m))} ${y}`;
    }
    return period;
  };

  const getMonthName = (month: number): string => {
    return t(`certificates.months.${month}`);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <TrophyIcon color="primary" fontSize="large" />
        {t('certificates.title')}
      </Typography>

      <Tabs value={tabValue} onChange={(_, v) => { setTabValue(v); setTopStudents([]); setTopClasses([]); setDetermined(false); }} sx={{ mb: 3 }}>
        <Tab label={t('certificates.monthly')} sx={{ textTransform: 'none' }} />
        <Tab label={t('certificates.yearly')} sx={{ textTransform: 'none' }} />
      </Tabs>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            {tabValue === 0 ? (
              <>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>{t('certificates.months.1').substring(0, 2)}...</InputLabel>
                  <Select
                    value={selectedMonth}
                    label={t('certificates.months.1').substring(0, 2) + '...'}
                    onChange={(e) => setSelectedMonth(e.target.value as number)}
                  >
                    {months.map((m) => (
                      <MenuItem key={m} value={m}>{getMonthName(m)}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 100 }}>
                  <InputLabel>{t('certificates.period')}</InputLabel>
                  <Select
                    value={selectedMonthYear}
                    label={t('certificates.period')}
                    onChange={(e) => setSelectedMonthYear(e.target.value as number)}
                  >
                    {years.map((y) => (
                      <MenuItem key={y} value={y}>{y}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </>
            ) : (
              <FormControl size="small" sx={{ minWidth: 100 }}>
                <InputLabel>{t('certificates.period')}</InputLabel>
                <Select
                  value={selectedYear}
                  label={t('certificates.period')}
                  onChange={(e) => setSelectedYear(e.target.value as number)}
                >
                  {years.map((y) => (
                    <MenuItem key={y} value={y}>{y}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} /> : <SearchIcon />}
              onClick={handleDetermine}
              disabled={loading}
            >
              {t('certificates.determine')}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {(topStudents.length > 0 || topClasses.length > 0) && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Top Students */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">{t('certificates.topStudents')}</Typography>
                  {topStudents.length > 0 && (
                    <Tooltip title={t('certificates.printStudentCerts')}>
                      <IconButton color="primary" onClick={handlePrintStudentCerts}>
                        <PrintIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('certificates.rank')}</TableCell>
                        <TableCell>{t('students.fullName')}</TableCell>
                        <TableCell>{t('students.grade')}</TableCell>
                        <TableCell align="right">{t('certificates.booksRead')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {topStudents.length > 0 ? (
                        topStudents.map((student) => (
                          <TableRow key={student.id}>
                            <TableCell>
                              <Chip
                                label={`${student.rank}`}
                                size="small"
                                color={student.rank === 1 ? 'warning' : student.rank === 2 ? 'default' : 'default'}
                                sx={student.rank === 1 ? { fontWeight: 'bold' } : {}}
                              />
                            </TableCell>
                            <TableCell>{student.fullName}</TableCell>
                            <TableCell>{student.grade}</TableCell>
                            <TableCell align="right">{student.booksRead}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} align="center">
                            <Typography color="text.secondary">{t('common.noData')}</Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Top Classes */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">{t('certificates.topClasses')}</Typography>
                  {topClasses.length > 0 && (
                    <Tooltip title={t('certificates.printClassCerts')}>
                      <IconButton color="primary" onClick={handlePrintClassCerts}>
                        <PrintIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('certificates.rank')}</TableCell>
                        <TableCell>{t('students.grade')}</TableCell>
                        <TableCell align="right">{t('certificates.booksRead')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {topClasses.length > 0 ? (
                        topClasses.map((cls) => (
                          <TableRow key={cls.grade}>
                            <TableCell>
                              <Chip
                                label={`${cls.rank}`}
                                size="small"
                                color={cls.rank === 1 ? 'success' : 'default'}
                                sx={cls.rank === 1 ? { fontWeight: 'bold' } : {}}
                              />
                            </TableCell>
                            <TableCell>{cls.grade}</TableCell>
                            <TableCell align="right">{cls.booksRead}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={3} align="center">
                            <Typography color="text.secondary">{t('common.noData')}</Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Action buttons */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleFinalize}
                disabled={topStudents.length === 0 && topClasses.length === 0}
              >
                {t('certificates.finalize')}
              </Button>
              {determined && (
                <Chip label={t('certificates.finalized')} color="success" />
              )}
            </Box>
          </Grid>
        </Grid>
      )}

      {/* History */}
      <Divider sx={{ my: 3 }} />
      <Typography variant="h6" gutterBottom>
        {t('certificates.history')}
      </Typography>

      {Object.keys(historyGroups).length > 0 ? (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('certificates.period')}</TableCell>
                <TableCell>{t('certificates.type')}</TableCell>
                <TableCell>{t('certificates.category')}</TableCell>
                <TableCell>{t('certificates.rank')}</TableCell>
                <TableCell>{t('certificates.awardee')}</TableCell>
                <TableCell align="right">{t('certificates.booksRead')}</TableCell>
                <TableCell align="right">{t('common.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.entries(historyGroups).map(([_key, awards]) => {
                const first = awards[0];
                return awards.map((award, idx) => (
                  <TableRow key={award.id}>
                    {idx === 0 && (
                      <>
                        <TableCell rowSpan={awards.length}>
                          {formatPeriodLabel(first.period, first.type)}
                        </TableCell>
                        <TableCell rowSpan={awards.length}>
                          <Chip
                            label={first.type === 'monthly' ? t('certificates.monthly') : t('certificates.yearly')}
                            size="small"
                            color={first.type === 'yearly' ? 'warning' : 'primary'}
                          />
                        </TableCell>
                      </>
                    )}
                    <TableCell>
                      {award.category === 'student' ? t('certificates.student') : t('certificates.class')}
                    </TableCell>
                    <TableCell>{award.rank}</TableCell>
                    <TableCell>{award.awardee}</TableCell>
                    <TableCell align="right">{award.booksRead}</TableCell>
                    {idx === 0 && (
                      <TableCell align="right" rowSpan={awards.length}>
                        <Tooltip title={t('common.delete')}>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeletePeriod(first.period, first.type)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    )}
                  </TableRow>
                ));
              })}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Typography color="text.secondary">{t('common.noData')}</Typography>
      )}
    </Box>
  );
};

export default CertificatesPage;
