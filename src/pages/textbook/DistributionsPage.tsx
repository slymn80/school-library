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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  AssignmentReturn as ReturnIcon,
  Visibility as ViewIcon,
  PictureAsPdf as PdfIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../../store/authStore';
import { exportTextbookDistributionReportPdf } from '../../utils/export';

interface Branch {
  id: number;
  name: string;
  grade: number;
  studentCount: number;
  teacher: { fullName: string } | null;
}

interface TextbookSet {
  id: number;
  name: string;
  grade: number;
  items: { textbook: { id: number; title: string } }[];
}

interface DistributionDetail {
  id: number;
  textbookId: number;
  distributedQty: number;
  returnedQty: number;
  missingQty: number;
  textbook: { id: number; title: string };
}

interface Distribution {
  id: number;
  branchId: number;
  setId: number;
  academicYear: string;
  distributedAt: string;
  returnedAt: string | null;
  status: string;
  branch: Branch;
  set: TextbookSet;
  details: DistributionDetail[];
}

interface ReturnDetail {
  textbookId: number;
  title: string;
  distributedQty: number;
  returnedQty: number;
  missingQty: number;
}

const DistributionsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [sets, setSets] = useState<TextbookSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDistribution, setSelectedDistribution] = useState<Distribution | null>(null);
  const [academicYear, setAcademicYear] = useState('2025-2026');
  const [statusFilter, setStatusFilter] = useState('');
  const [formData, setFormData] = useState({ branchId: '', setId: '', notes: '' });
  const [returnDetails, setReturnDetails] = useState<ReturnDetail[]>([]);
  const [returnNotes, setReturnNotes] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const fetchDistributions = async () => {
    try {
      const filters: any = {};
      if (academicYear) filters.academicYear = academicYear;
      if (statusFilter) filters.status = statusFilter;

      const response = await window.electronAPI.textbookDistributions.getAll(filters);
      if (response.success) {
        setDistributions(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch distributions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const response = await window.electronAPI.branches.getAll();
      if (response.success) {
        setBranches(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch branches:', error);
    }
  };

  const fetchSets = async () => {
    try {
      const response = await window.electronAPI.textbookSets.getAll();
      if (response.success) {
        setSets(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch sets:', error);
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
    fetchBranches();
    fetchSets();
  }, []);

  useEffect(() => {
    fetchDistributions();
  }, [academicYear, statusFilter]);

  const handleOpenDialog = () => {
    setFormData({ branchId: '', setId: '', notes: '' });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setFormData({ branchId: '', setId: '', notes: '' });
  };

  const handleCreate = async () => {
    if (!formData.branchId || !formData.setId) {
      setSnackbar({ open: true, message: t('validation.required'), severity: 'error' });
      return;
    }

    try {
      const response = await window.electronAPI.textbookDistributions.create(
        {
          branchId: Number(formData.branchId),
          setId: Number(formData.setId),
          academicYear,
          notes: formData.notes || undefined,
        },
        user!.id
      );

      if (response.success) {
        setSnackbar({ open: true, message: t('common.success'), severity: 'success' });
        handleCloseDialog();
        fetchDistributions();
      } else {
        let errorMessage = t('common.error');
        if (response.error === 'INSUFFICIENT_STOCK') {
          errorMessage = t('textbookModule.insufficientStockFor', {
            textbook: response.data?.textbook,
            required: response.data?.required,
            available: response.data?.available,
          });
        }
        setSnackbar({ open: true, message: errorMessage, severity: 'error' });
      }
    } catch (error) {
      console.error('Failed to create distribution:', error);
      setSnackbar({ open: true, message: t('common.error'), severity: 'error' });
    }
  };

  const handleOpenReturnDialog = (distribution: Distribution) => {
    setSelectedDistribution(distribution);
    setReturnDetails(
      distribution.details.map(d => ({
        textbookId: d.textbookId,
        title: d.textbook.title,
        distributedQty: d.distributedQty,
        returnedQty: d.distributedQty,
        missingQty: 0,
      }))
    );
    setReturnNotes('');
    setReturnDialogOpen(true);
  };

  const handleCloseReturnDialog = () => {
    setReturnDialogOpen(false);
    setSelectedDistribution(null);
    setReturnDetails([]);
    setReturnNotes('');
  };

  const handleReturn = async () => {
    if (!selectedDistribution) return;

    try {
      const response = await window.electronAPI.textbookDistributions.return(
        selectedDistribution.id,
        returnDetails.map(d => ({
          textbookId: d.textbookId,
          returnedQty: d.returnedQty,
          missingQty: d.missingQty,
        })),
        user!.id,
        returnNotes || undefined
      );

      if (response.success) {
        setSnackbar({ open: true, message: t('common.success'), severity: 'success' });
        handleCloseReturnDialog();
        fetchDistributions();
      } else {
        setSnackbar({ open: true, message: t('common.error'), severity: 'error' });
      }
    } catch (error) {
      console.error('Failed to return distribution:', error);
      setSnackbar({ open: true, message: t('common.error'), severity: 'error' });
    }
  };

  const handleUpdateReturnDetail = (textbookId: number, field: 'returnedQty' | 'missingQty', value: number) => {
    setReturnDetails(
      returnDetails.map(d => {
        if (d.textbookId !== textbookId) return d;

        const updated = { ...d, [field]: Math.max(0, value) };
        // Ensure returned + missing <= distributed
        const total = updated.returnedQty + updated.missingQty;
        if (total > d.distributedQty) {
          if (field === 'returnedQty') {
            updated.missingQty = Math.max(0, d.distributedQty - updated.returnedQty);
          } else {
            updated.returnedQty = Math.max(0, d.distributedQty - updated.missingQty);
          }
        }
        return updated;
      })
    );
  };

  const handleViewDistribution = (distribution: Distribution) => {
    setSelectedDistribution(distribution);
    setViewDialogOpen(true);
  };

  const handleDeleteClick = (distribution: Distribution) => {
    setSelectedDistribution(distribution);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedDistribution) return;

    try {
      const response = await window.electronAPI.textbookDistributions.delete(selectedDistribution.id, user!.id);
      if (response.success) {
        setSnackbar({ open: true, message: t('common.success'), severity: 'success' });
        setDeleteDialogOpen(false);
        setSelectedDistribution(null);
        fetchDistributions();
      } else {
        setSnackbar({ open: true, message: t('common.error'), severity: 'error' });
      }
    } catch (error) {
      console.error('Failed to delete distribution:', error);
      setSnackbar({ open: true, message: t('common.error'), severity: 'error' });
    }
  };

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

  const selectedBranch = branches.find(b => b.id === Number(formData.branchId));
  const filteredSets = sets.filter(s => !selectedBranch || s.grade === selectedBranch.grade);

  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 70 },
    {
      field: 'branch',
      headerName: t('textbookModule.branch'),
      flex: 1,
      minWidth: 150,
      valueGetter: (params: any) => `${params.row.branch.grade}${params.row.branch.name}`,
    },
    {
      field: 'set',
      headerName: t('textbookModule.set'),
      flex: 1,
      minWidth: 150,
      valueGetter: (params: any) => params.row.set.name,
    },
    {
      field: 'teacher',
      headerName: t('textbookModule.teacher'),
      flex: 1,
      minWidth: 150,
      valueGetter: (params: any) => params.row.branch.teacher?.fullName || '-',
    },
    { field: 'academicYear', headerName: t('textbookModule.academicYear'), width: 120 },
    {
      field: 'distributedAt',
      headerName: t('textbookModule.distributionDate'),
      width: 120,
      valueGetter: (params: any) => new Date(params.value).toLocaleDateString(),
    },
    {
      field: 'status',
      headerName: t('textbookModule.status'),
      width: 130,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={getStatusLabel(params.value)}
          color={getStatusColor(params.value)}
          size="small"
        />
      ),
    },
    {
      field: 'actions',
      headerName: t('common.actions'),
      width: 180,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => {
        const dist = params.row as Distribution;
        return (
          <Box>
            <IconButton
              size="small"
              onClick={() => handleViewDistribution(dist)}
              color="info"
            >
              <ViewIcon />
            </IconButton>
            {dist.status === 'distributed' && (
              <IconButton
                size="small"
                onClick={() => handleOpenReturnDialog(dist)}
                color="success"
              >
                <ReturnIcon />
              </IconButton>
            )}
            {dist.status === 'distributed' && (
              <IconButton
                size="small"
                onClick={() => handleDeleteClick(dist)}
                color="error"
              >
                <DeleteIcon />
              </IconButton>
            )}
          </Box>
        );
      },
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">{t('textbookModule.distributions')}</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenDialog}
        >
          {t('textbookModule.newDistribution')}
        </Button>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            label={t('textbookModule.academicYear')}
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            size="small"
            sx={{ width: 150 }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>{t('textbookModule.status')}</InputLabel>
            <Select
              value={statusFilter}
              label={t('textbookModule.status')}
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

      {/* Create Distribution Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{t('textbookModule.newDistribution')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('textbookModule.academicYear')}: {academicYear}
          </Typography>

          <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
            <InputLabel>{t('textbookModule.branch')}</InputLabel>
            <Select
              value={formData.branchId}
              label={t('textbookModule.branch')}
              onChange={(e) => setFormData({ ...formData, branchId: e.target.value, setId: '' })}
            >
              {branches.map((branch) => (
                <MenuItem key={branch.id} value={branch.id}>
                  {branch.grade}{branch.name} ({branch.studentCount} {t('textbookModule.students')})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
            <InputLabel>{t('textbookModule.set')}</InputLabel>
            <Select
              value={formData.setId}
              label={t('textbookModule.set')}
              onChange={(e) => setFormData({ ...formData, setId: e.target.value })}
              disabled={!formData.branchId}
            >
              {filteredSets.map((set) => (
                <MenuItem key={set.id} value={set.id}>
                  {set.name} ({set.items.length} {t('textbookModule.textbooks')})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {selectedBranch && formData.setId && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {t('textbookModule.willDistribute', {
                count: selectedBranch.studentCount * (filteredSets.find(s => s.id === Number(formData.setId))?.items.length || 0),
              })}
            </Alert>
          )}

          <TextField
            fullWidth
            multiline
            rows={2}
            label={t('textbookModule.notes')}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder={t('textbookModule.notesPlaceholder')}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>{t('common.cancel')}</Button>
          <Button onClick={handleCreate} variant="contained">
            {t('textbookModule.distribute')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Return Dialog */}
      <Dialog open={returnDialogOpen} onClose={handleCloseReturnDialog} maxWidth="md" fullWidth>
        <DialogTitle>{t('textbookModule.returnBooks')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {selectedDistribution?.branch.grade}{selectedDistribution?.branch.name} - {selectedDistribution?.set.name}
          </Typography>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('textbookModule.textbook')}</TableCell>
                  <TableCell align="center">{t('textbookModule.distributed')}</TableCell>
                  <TableCell align="center">{t('textbookModule.returned')}</TableCell>
                  <TableCell align="center">{t('textbookModule.missing')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {returnDetails.map((detail) => (
                  <TableRow key={detail.textbookId}>
                    <TableCell>{detail.title}</TableCell>
                    <TableCell align="center">{detail.distributedQty}</TableCell>
                    <TableCell align="center">
                      <TextField
                        type="number"
                        size="small"
                        value={detail.returnedQty}
                        onChange={(e) => handleUpdateReturnDetail(detail.textbookId, 'returnedQty', parseInt(e.target.value) || 0)}
                        inputProps={{ min: 0, max: detail.distributedQty }}
                        sx={{ width: 80 }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <TextField
                        type="number"
                        size="small"
                        value={detail.missingQty}
                        onChange={(e) => handleUpdateReturnDetail(detail.textbookId, 'missingQty', parseInt(e.target.value) || 0)}
                        inputProps={{ min: 0, max: detail.distributedQty }}
                        sx={{ width: 80 }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <TextField
            fullWidth
            multiline
            rows={2}
            label={t('textbookModule.notes')}
            value={returnNotes}
            onChange={(e) => setReturnNotes(e.target.value)}
            placeholder={t('textbookModule.returnNotesPlaceholder')}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseReturnDialog}>{t('common.cancel')}</Button>
          <Button onClick={handleReturn} variant="contained" color="success">
            {t('textbookModule.confirmReturn')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Distribution Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{t('textbookModule.distributionDetails')}</DialogTitle>
        <DialogContent>
          {selectedDistribution && (
            <>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>{t('textbookModule.branch')}:</strong> {selectedDistribution.branch.grade}{selectedDistribution.branch.name}
                </Typography>
                <Typography variant="body2">
                  <strong>{t('textbookModule.set')}:</strong> {selectedDistribution.set.name}
                </Typography>
                <Typography variant="body2">
                  <strong>{t('textbookModule.teacher')}:</strong> {selectedDistribution.branch.teacher?.fullName || '-'}
                </Typography>
                <Typography variant="body2">
                  <strong>{t('textbookModule.academicYear')}:</strong> {selectedDistribution.academicYear}
                </Typography>
                <Typography variant="body2">
                  <strong>{t('textbookModule.distributionDate')}:</strong> {new Date(selectedDistribution.distributedAt).toLocaleDateString()}
                </Typography>
                <Typography variant="body2">
                  <strong>{t('textbookModule.status')}:</strong>{' '}
                  <Chip label={getStatusLabel(selectedDistribution.status)} color={getStatusColor(selectedDistribution.status)} size="small" />
                </Typography>
              </Box>

              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('textbookModule.textbook')}</TableCell>
                      <TableCell align="center">{t('textbookModule.distributed')}</TableCell>
                      <TableCell align="center">{t('textbookModule.returned')}</TableCell>
                      <TableCell align="center">{t('textbookModule.missing')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedDistribution.details.map((detail) => (
                      <TableRow key={detail.id}>
                        <TableCell>{detail.textbook.title}</TableCell>
                        <TableCell align="center">{detail.distributedQty}</TableCell>
                        <TableCell align="center">{detail.returnedQty}</TableCell>
                        <TableCell align="center">
                          {detail.missingQty > 0 ? (
                            <Chip label={detail.missingQty} color="error" size="small" />
                          ) : (
                            detail.missingQty
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            startIcon={<PdfIcon />}
            onClick={async () => {
              if (!selectedDistribution) return;
              const settingsRes = await window.electronAPI.settings.get();
              const s = settingsRes.success ? settingsRes.data : null;
              await exportTextbookDistributionReportPdf(selectedDistribution, s, t, i18n.language);
            }}
          >
            {t('textbookModule.reports.printReport')}
          </Button>
          <Button onClick={() => setViewDialogOpen(false)}>{t('common.close')}</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>{t('textbookModule.deleteDistribution')}</DialogTitle>
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

export default DistributionsPage;
