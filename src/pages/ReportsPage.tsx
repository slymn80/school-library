import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  CircularProgress,
} from '@mui/material';
import {
  FileDownload as ExcelIcon,
  PictureAsPdf as PdfIcon,
  MenuBook as BooksIcon,
  School as StudentsIcon,
  SwapHoriz as LoansIcon,
  Warning as OverdueIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import {
  exportBooksToExcel,
  exportStudentsToExcel,
  exportLoansToExcel,
  exportOverdueReportToPdf,
  exportBooksInventoryToPdf,
} from '../utils/export';

interface ReportCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onExcelExport?: () => void;
  onPdfExport?: () => void;
  loading?: boolean;
}

const ReportCard: React.FC<ReportCardProps> = ({
  title,
  description,
  icon,
  onExcelExport,
  onPdfExport,
  loading,
}) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Box
          sx={{
            backgroundColor: '#1976d2',
            borderRadius: '50%',
            p: 1,
            mr: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {React.cloneElement(icon as React.ReactElement, { sx: { color: 'white' } })}
        </Box>
        <Typography variant="h6">{title}</Typography>
      </Box>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
        {description}
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {onExcelExport && (
          <Button
            variant="outlined"
            size="small"
            startIcon={loading ? <CircularProgress size={16} /> : <ExcelIcon />}
            onClick={onExcelExport}
            disabled={loading}
          >
            Excel
          </Button>
        )}
        {onPdfExport && (
          <Button
            variant="outlined"
            size="small"
            startIcon={loading ? <CircularProgress size={16} /> : <PdfIcon />}
            onClick={onPdfExport}
            disabled={loading}
          >
            PDF
          </Button>
        )}
      </Box>
    </CardContent>
  </Card>
);

const ReportsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState<string | null>(null);

  const handleBooksExport = async (format: 'excel' | 'pdf') => {
    setLoading('books-' + format);
    try {
      const response = await window.electronAPI.books.getAll();
      if (response.success) {
        if (format === 'excel') {
          exportBooksToExcel(response.data, t, i18n.language);
        } else {
          const settingsResponse = await window.electronAPI.settings.get();
          await exportBooksInventoryToPdf(response.data, t, i18n.language, settingsResponse.data);
        }
        toast.success(t('common.success'));
      }
    } catch (error) {
      toast.error(t('errors.general'));
    }
    setLoading(null);
  };

  const handleStudentsExport = async () => {
    setLoading('students');
    try {
      const response = await window.electronAPI.students.getAll();
      if (response.success) {
        exportStudentsToExcel(response.data, t);
        toast.success(t('common.success'));
      }
    } catch (error) {
      toast.error(t('errors.general'));
    }
    setLoading(null);
  };

  const handleLoansExport = async (status?: string) => {
    setLoading('loans-' + (status || 'all'));
    try {
      const response = await window.electronAPI.loans.getAll(status ? { status } : undefined);
      if (response.success) {
        exportLoansToExcel(response.data, t, i18n.language);
        toast.success(t('common.success'));
      }
    } catch (error) {
      toast.error(t('errors.general'));
    }
    setLoading(null);
  };

  const handleOverdueExport = async () => {
    setLoading('overdue');
    try {
      const response = await window.electronAPI.loans.getAll({ status: 'overdue' });
      if (response.success) {
        const settingsResponse = await window.electronAPI.settings.get();
        await exportOverdueReportToPdf(response.data, t, i18n.language, settingsResponse.data);
        toast.success(t('common.success'));
      }
    } catch (error) {
      toast.error(t('errors.general'));
    }
    setLoading(null);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {t('reports.title')}
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <ReportCard
            title={t('reports.booksInventory')}
            description={t('books.title')}
            icon={<BooksIcon />}
            onExcelExport={() => handleBooksExport('excel')}
            onPdfExport={() => handleBooksExport('pdf')}
            loading={loading?.startsWith('books')}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <ReportCard
            title={t('reports.studentsList')}
            description={t('students.title')}
            icon={<StudentsIcon />}
            onExcelExport={handleStudentsExport}
            loading={loading === 'students'}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <ReportCard
            title={t('reports.activeLoansReport')}
            description={t('loans.activeLoans')}
            icon={<LoansIcon />}
            onExcelExport={() => handleLoansExport('active')}
            loading={loading === 'loans-active'}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <ReportCard
            title={t('reports.overdueReport')}
            description={t('loans.overdueLoans')}
            icon={<OverdueIcon />}
            onExcelExport={() => handleLoansExport('overdue')}
            onPdfExport={handleOverdueExport}
            loading={loading?.startsWith('overdue') || loading === 'loans-overdue'}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default ReportsPage;
