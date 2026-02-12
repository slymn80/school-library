import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar,
  Chip,
  InputAdornment,
  Grid,
  Autocomplete,
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Undo as UndoIcon,
  PictureAsPdf as PdfIcon,
  FileDownload as DownloadIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../../store/authStore';
import { exportTextbookIndividualDistReportPdf, exportIndividualDistributionsToExcel } from '../../utils/export';

interface IndividualDistribution {
  id: number;
  textbookId: number;
  textbook: {
    id: number;
    title: string;
    author: string | null;
    subject: string;
  };
  recipientType: string;
  recipientId: number;
  recipientName: string;
  quantity: number;
  academicYear: string;
  distributedAt: string;
  returnedAt: string | null;
  returnedQty: number;
  missingQty: number;
  status: string;
  notes: string | null;
  returnNotes: string | null;
}

interface Textbook {
  id: number;
  title: string;
  author: string | null;
  subject: string;
  availableStock: number;
}

interface Teacher {
  id: number;
  fullName: string;
}

interface Student {
  id: number;
  fullName: string;
  studentId: string;
  grade: string;
}

const IndividualDistributionsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const [distributions, setDistributions] = useState<IndividualDistribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDistribution, setSelectedDistribution] = useState<IndividualDistribution | null>(null);
  const [textbooks, setTextbooks] = useState<Textbook[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [academicYear, setAcademicYear] = useState('2025-2026');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [recipientTypeFilter, setRecipientTypeFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    textbookId: null as number | null,
    recipientType: 'teacher' as 'teacher' | 'student',
    recipientId: null as number | null,
    quantity: 1,
    notes: '',
  });

  const [returnData, setReturnData] = useState({
    returnedQty: 0,
    missingQty: 0,
    returnNotes: '',
  });

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const fetchDistributions = async () => {
    try {
      const filters: any = { academicYear };
      if (statusFilter) filters.status = statusFilter;
      if (recipientTypeFilter) filters.recipientType = recipientTypeFilter;

      const response = await window.electronAPI.individualDistributions.getAll(filters);
      if (response.success) {
        let data = response.data;
        if (searchQuery) {
          data = data.filter((d: IndividualDistribution) =>
            d.recipientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.textbook.title.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }
        setDistributions(data);
      }
    } catch (error) {
      console.error('Failed to fetch distributions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTextbooks = async () => {
    try {
      const response = await window.electronAPI.textbooks.getAll();
      if (response.success) {
        setTextbooks(response.data.filter((t: Textbook) => t.availableStock > 0));
      }
    } catch (error) {
      console.error('Failed to fetch textbooks:', error);
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await window.electronAPI.teachers.getAll();
      if (response.success) {
        setTeachers(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch teachers:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await window.electronAPI.students.getAll();
      if (response.success) {
        setStudents(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch students:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await window.electronAPI.settings.get();
      if (response.success && response.data?.academicYear) {
        setAcademicYear(response.data.academicYear);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchTextbooks();
    fetchTeachers();
    fetchStudents();
  }, []);

  useEffect(() => {
    fetchDistributions();
  }, [academicYear, statusFilter, recipientTypeFilter, searchQuery]);

  const handleOpenDialog = () => {
    setFormData({
      textbookId: null,
      recipientType: 'teacher',
      recipientId: null,
      quantity: 1,
      notes: '',
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleSave = async () => {
    if (!formData.textbookId || !formData.recipientId) {
      setSnackbar({ open: true, message: t('validation.required'), severity: 'error' });
      return;
    }

    const recipient = formData.recipientType === 'teacher'
      ? teachers.find(t => t.id === formData.recipientId)
      : students.find(s => s.id === formData.recipientId);

    if (!recipient) {
      setSnackbar({ open: true, message: t('common.error'), severity: 'error' });
      return;
    }

    try {
      const response = await window.electronAPI.individualDistributions.create({
        textbookId: formData.textbookId,
        recipientType: formData.recipientType,
        recipientId: formData.recipientId,
        recipientName: recipient.fullName,
        quantity: formData.quantity,
        academicYear,
        notes: formData.notes || undefined,
      }, user!.id);

      if (response.success) {
        setSnackbar({ open: true, message: t('common.success'), severity: 'success' });
        handleCloseDialog();
        fetchDistributions();
        fetchTextbooks();
      } else {
        const errorMessage = response.error === 'INSUFFICIENT_STOCK'
          ? t('textbookModule.insufficientStock')
          : t('common.error');
        setSnackbar({ open: true, message: errorMessage, severity: 'error' });
      }
    } catch (error) {
      console.error('Failed to create distribution:', error);
      setSnackbar({ open: true, message: t('common.error'), severity: 'error' });
    }
  };

  const handleOpenReturnDialog = (distribution: IndividualDistribution) => {
    setSelectedDistribution(distribution);
    setReturnData({
      returnedQty: distribution.quantity - distribution.returnedQty - distribution.missingQty,
      missingQty: 0,
      returnNotes: '',
    });
    setReturnDialogOpen(true);
  };

  const handleReturn = async () => {
    if (!selectedDistribution) return;

    try {
      const response = await window.electronAPI.individualDistributions.return(
        selectedDistribution.id,
        returnData.returnedQty,
        returnData.missingQty,
        returnData.returnNotes || undefined,
        user!.id
      );

      if (response.success) {
        setSnackbar({ open: true, message: t('common.success'), severity: 'success' });
        setReturnDialogOpen(false);
        setSelectedDistribution(null);
        fetchDistributions();
        fetchTextbooks();
      } else {
        setSnackbar({ open: true, message: t('common.error'), severity: 'error' });
      }
    } catch (error) {
      console.error('Failed to return distribution:', error);
      setSnackbar({ open: true, message: t('common.error'), severity: 'error' });
    }
  };

  const handleDeleteClick = (distribution: IndividualDistribution) => {
    setSelectedDistribution(distribution);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedDistribution) return;

    try {
      const response = await window.electronAPI.individualDistributions.delete(selectedDistribution.id, user!.id);
      if (response.success) {
        setSnackbar({ open: true, message: t('common.success'), severity: 'success' });
        setDeleteDialogOpen(false);
        setSelectedDistribution(null);
        fetchDistributions();
        fetchTextbooks();
      } else {
        setSnackbar({ open: true, message: t('common.error'), severity: 'error' });
      }
    } catch (error) {
      console.error('Failed to delete distribution:', error);
      setSnackbar({ open: true, message: t('common.error'), severity: 'error' });
    }
  };

  const getStatusChip = (status: string) => {
    const statusConfig: Record<string, { label: string; color: 'warning' | 'success' | 'error' }> = {
      distributed: { label: t('textbookModule.distributed'), color: 'warning' },
      returned: { label: t('textbookModule.returned'), color: 'success' },
      partial: { label: t('textbookModule.partial'), color: 'error' },
    };
    const config = statusConfig[status] || { label: status, color: 'warning' };
    return <Chip label={config.label} color={config.color} size="small" />;
  };

  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 60 },
    {
      field: 'textbook',
      headerName: t('textbookModule.textbook'),
      flex: 1,
      minWidth: 200,
      valueGetter: (params: any) => params.row?.textbook?.title || '-',
    },
    {
      field: 'recipientType',
      headerName: t('textbookModule.recipientType'),
      width: 120,
      valueGetter: (value: any) => value === 'teacher' ? t('textbookModule.teacher') : t('textbookModule.student'),
    },
    { field: 'recipientName', headerName: t('textbookModule.recipientName'), width: 180 },
    { field: 'quantity', headerName: t('textbookModule.quantity'), width: 80 },
    {
      field: 'distributedAt',
      headerName: t('textbookModule.distributedAt'),
      width: 120,
      valueFormatter: (value: any) => value ? new Date(value).toLocaleDateString() : '-',
    },
    {
      field: 'status',
      headerName: t('common.status'),
      width: 120,
      renderCell: (params: GridRenderCellParams) => getStatusChip(params.value as string),
    },
    {
      field: 'returnInfo',
      headerName: t('textbookModule.returnInfo'),
      width: 150,
      valueGetter: (params: any) => {
        const row = params.row as IndividualDistribution;
        if (row.status === 'distributed') return '-';
        return `${row.returnedQty} ${t('textbookModule.returned')} / ${row.missingQty} ${t('textbookModule.missing')}`;
      },
    },
    {
      field: 'actions',
      headerName: t('common.actions'),
      width: 120,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => {
        const row = params.row as IndividualDistribution;
        return (
          <Box>
            {row.status === 'distributed' && (
              <IconButton
                size="small"
                onClick={() => handleOpenReturnDialog(row)}
                color="primary"
                title={t('textbookModule.return')}
              >
                <UndoIcon />
              </IconButton>
            )}
            <IconButton
              size="small"
              onClick={() => handleDeleteClick(row)}
              color="error"
              title={t('common.delete')}
            >
              <DeleteIcon />
            </IconButton>
          </Box>
        );
      },
    },
  ];

  const selectedTextbook = textbooks.find(t => t.id === formData.textbookId);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">{t('textbookModule.individualDistributions')}</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<PdfIcon />}
            onClick={async () => {
              const settingsRes = await window.electronAPI.settings.get();
              const s = settingsRes.success ? settingsRes.data : null;
              await exportTextbookIndividualDistReportPdf(distributions, academicYear, s, t, i18n.language);
            }}
          >
            {t('textbookModule.reports.printReport')}
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => exportIndividualDistributionsToExcel(distributions, t)}
          >
            {t('textbookModule.exportExcel')}
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenDialog}
          >
            {t('textbookModule.newIndividualDistribution')}
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            placeholder={t('common.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 250 }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>{t('textbookModule.recipientType')}</InputLabel>
            <Select
              value={recipientTypeFilter}
              label={t('textbookModule.recipientType')}
              onChange={(e) => setRecipientTypeFilter(e.target.value)}
            >
              <MenuItem value="">{t('common.all')}</MenuItem>
              <MenuItem value="teacher">{t('textbookModule.teacher')}</MenuItem>
              <MenuItem value="student">{t('textbookModule.student')}</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>{t('common.status')}</InputLabel>
            <Select
              value={statusFilter}
              label={t('common.status')}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="">{t('common.all')}</MenuItem>
              <MenuItem value="distributed">{t('textbookModule.distributed')}</MenuItem>
              <MenuItem value="returned">{t('textbookModule.returned')}</MenuItem>
              <MenuItem value="partial">{t('textbookModule.partial')}</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      <Paper sx={{ height: 'calc(100vh - 320px)', width: '100%' }}>
        <DataGrid
          rows={distributions}
          columns={columns}
          loading={loading}
          pageSizeOptions={[10, 25, 50]}
          initialState={{
            pagination: { paginationModel: { pageSize: 25 } },
          }}
          disableRowSelectionOnClick
        />
      </Paper>

      {/* Add Distribution Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{t('textbookModule.newIndividualDistribution')}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Autocomplete
                options={textbooks}
                getOptionLabel={(option) => `${option.title} (${t('textbookModule.available')}: ${option.availableStock})`}
                value={textbooks.find(t => t.id === formData.textbookId) || null}
                onChange={(_, newValue) => setFormData({ ...formData, textbookId: newValue?.id || null })}
                renderInput={(params) => (
                  <TextField {...params} label={t('textbookModule.textbook')} required />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>{t('textbookModule.recipientType')}</InputLabel>
                <Select
                  value={formData.recipientType}
                  label={t('textbookModule.recipientType')}
                  onChange={(e) => setFormData({ ...formData, recipientType: e.target.value as 'teacher' | 'student', recipientId: null })}
                >
                  <MenuItem value="teacher">{t('textbookModule.teacher')}</MenuItem>
                  <MenuItem value="student">{t('textbookModule.student')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              {formData.recipientType === 'teacher' ? (
                <Autocomplete
                  options={teachers}
                  getOptionLabel={(option) => option.fullName}
                  value={teachers.find(t => t.id === formData.recipientId) || null}
                  onChange={(_, newValue) => setFormData({ ...formData, recipientId: newValue?.id || null })}
                  renderInput={(params) => (
                    <TextField {...params} label={t('textbookModule.teacher')} required />
                  )}
                />
              ) : (
                <Autocomplete
                  options={students}
                  getOptionLabel={(option) => `${option.fullName} (${option.grade} - ${option.studentId})`}
                  value={students.find(s => s.id === formData.recipientId) || null}
                  onChange={(_, newValue) => setFormData({ ...formData, recipientId: newValue?.id || null })}
                  renderInput={(params) => (
                    <TextField {...params} label={t('textbookModule.student')} required />
                  )}
                />
              )}
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label={t('textbookModule.quantity')}
                type="number"
                fullWidth
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                inputProps={{ min: 1, max: selectedTextbook?.availableStock || 999 }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label={t('textbookModule.notes')}
                fullWidth
                multiline
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>{t('common.cancel')}</Button>
          <Button onClick={handleSave} variant="contained">
            {t('textbookModule.distribute')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Return Dialog */}
      <Dialog open={returnDialogOpen} onClose={() => setReturnDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('textbookModule.return')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {selectedDistribution?.textbook?.title} - {selectedDistribution?.recipientName}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('textbookModule.distributed')}: {selectedDistribution?.quantity}
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label={t('textbookModule.returnedQty')}
                type="number"
                fullWidth
                value={returnData.returnedQty}
                onChange={(e) => setReturnData({ ...returnData, returnedQty: Math.max(0, parseInt(e.target.value) || 0) })}
                inputProps={{ min: 0, max: selectedDistribution?.quantity || 0 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label={t('textbookModule.missingQty')}
                type="number"
                fullWidth
                value={returnData.missingQty}
                onChange={(e) => setReturnData({ ...returnData, missingQty: Math.max(0, parseInt(e.target.value) || 0) })}
                inputProps={{ min: 0, max: selectedDistribution?.quantity || 0 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label={t('textbookModule.returnNotes')}
                fullWidth
                multiline
                rows={2}
                value={returnData.returnNotes}
                onChange={(e) => setReturnData({ ...returnData, returnNotes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReturnDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button onClick={handleReturn} variant="contained">
            {t('textbookModule.return')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>{t('common.delete')}</DialogTitle>
        <DialogContent>
          <Typography>
            {t('textbookModule.deleteDistributionConfirm')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            {t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default IndividualDistributionsPage;
