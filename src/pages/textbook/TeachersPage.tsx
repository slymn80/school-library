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
  Alert,
  Snackbar,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FileUpload as ImportIcon,
  FileDownload as DownloadIcon,
  DeleteSweep as DeleteSweepIcon,
  PictureAsPdf as PdfIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../../store/authStore';
import * as XLSX from 'xlsx';
import { exportTeachersToExcel, exportTeachersListPdf } from '../../utils/export';

interface Teacher {
  id: number;
  fullName: string;
  phone: string | null;
  branches: { id: number; name: string; grade: number }[];
  createdAt: string;
}

const TeachersPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [formData, setFormData] = useState({ fullName: '', phone: '' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const [deleteAllPasswordOpen, setDeleteAllPasswordOpen] = useState(false);
  const [deleteAllConfirmOpen, setDeleteAllConfirmOpen] = useState(false);
  const [deleteAllPassword, setDeleteAllPassword] = useState('');

  const fetchTeachers = async () => {
    try {
      const response = await window.electronAPI.teachers.getAll();
      if (response.success) {
        setTeachers(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch teachers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const handleOpenDialog = (teacher?: Teacher) => {
    if (teacher) {
      setSelectedTeacher(teacher);
      setFormData({ fullName: teacher.fullName, phone: teacher.phone || '' });
    } else {
      setSelectedTeacher(null);
      setFormData({ fullName: '', phone: '' });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedTeacher(null);
    setFormData({ fullName: '', phone: '' });
  };

  const handleSave = async () => {
    if (!formData.fullName.trim()) {
      setSnackbar({ open: true, message: t('validation.required'), severity: 'error' });
      return;
    }

    try {
      let response;
      if (selectedTeacher) {
        response = await window.electronAPI.teachers.update(
          selectedTeacher.id,
          { fullName: formData.fullName, phone: formData.phone || undefined },
          user!.id
        );
      } else {
        response = await window.electronAPI.teachers.create(
          { fullName: formData.fullName, phone: formData.phone || undefined },
          user!.id
        );
      }

      if (response.success) {
        setSnackbar({ open: true, message: t('common.success'), severity: 'success' });
        handleCloseDialog();
        fetchTeachers();
      } else {
        setSnackbar({ open: true, message: t('common.error'), severity: 'error' });
      }
    } catch (error) {
      console.error('Failed to save teacher:', error);
      setSnackbar({ open: true, message: t('common.error'), severity: 'error' });
    }
  };

  const handleDeleteClick = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedTeacher) return;

    try {
      const response = await window.electronAPI.teachers.delete(selectedTeacher.id, user!.id);
      if (response.success) {
        setSnackbar({ open: true, message: t('common.success'), severity: 'success' });
        setDeleteDialogOpen(false);
        setSelectedTeacher(null);
        fetchTeachers();
      } else {
        const errorMessage = response.error === 'TEACHER_HAS_BRANCHES'
          ? t('textbookModule.teacherHasBranches')
          : t('common.error');
        setSnackbar({ open: true, message: errorMessage, severity: 'error' });
      }
    } catch (error) {
      console.error('Failed to delete teacher:', error);
      setSnackbar({ open: true, message: t('common.error'), severity: 'error' });
    }
  };

  const handleDeleteAllPassword = async () => {
    try {
      const response = await window.electronAPI.auth.login(user!.username, deleteAllPassword);
      if (response.success) {
        setDeleteAllPasswordOpen(false);
        setDeleteAllConfirmOpen(true);
      } else {
        setSnackbar({ open: true, message: t('textbookModule.wrongPassword'), severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: t('common.error'), severity: 'error' });
    }
  };

  const handleDeleteAll = async () => {
    try {
      const response = await window.electronAPI.teachers.deleteAll(user!.id, deleteAllPassword);
      if (response.success) {
        const { deletedCount, skippedCount } = response.data;
        let message = t('textbookModule.deleteAllSuccess', { count: deletedCount });
        if (skippedCount > 0) {
          message += '. ' + t('textbookModule.skippedTeachers', { count: skippedCount });
        }
        setSnackbar({ open: true, message, severity: 'success' });
        setDeleteAllConfirmOpen(false);
        setDeleteAllPassword('');
        fetchTeachers();
      } else {
        setSnackbar({ open: true, message: t('common.error'), severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: t('common.error'), severity: 'error' });
    }
  };

  const handleDownloadTemplate = () => {
    const lang = i18n.language;
    let headerName: string;
    let headerPhone: string;
    let sampleName: string;
    let sheetName: string;

    if (lang === 'tr') {
      headerName = 'Ad Soyad';
      headerPhone = 'Telefon';
      sampleName = 'Ahmet Yılmaz';
      sheetName = 'Öğretmenler';
    } else if (lang === 'kk') {
      headerName = 'Аты-жөні';
      headerPhone = 'Телефон';
      sampleName = 'Ахметов Айбек Серікұлы';
      sheetName = 'Мұғалімдер';
    } else if (lang === 'en') {
      headerName = 'Full Name';
      headerPhone = 'Phone';
      sampleName = 'John Smith';
      sheetName = 'Teachers';
    } else {
      headerName = 'ФИО';
      headerPhone = 'Телефон';
      sampleName = 'Иванов Иван Иванович';
      sheetName = 'Учителя';
    }

    const templateData = [
      { [headerName]: sampleName, [headerPhone]: '+7 (777) 123-45-67' },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    ws['!cols'] = [{ wch: 30 }, { wch: 20 }];
    XLSX.writeFile(wb, 'teachers_template.xlsx');
  };

  const getCol = (row: any, ...keys: string[]): any => {
    for (const key of keys) {
      if (row[key] !== undefined && row[key] !== null && row[key] !== '') return row[key];
    }
    return undefined;
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResults(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      for (let i = 0; i < jsonData.length; i++) {
        const row: any = jsonData[i];
        try {
          const fullName = String(getCol(row, 'Ad Soyad', 'ФИО', 'Аты-жөні', 'Full Name', 'fullName', 'Öğretmen Adı') || '').trim();
          const phone = String(getCol(row, 'Telefon', 'Телефон', 'Phone', 'phone') || '').trim() || undefined;

          if (!fullName) {
            errors.push(`${t('textbookModule.row')} ${i + 2}: ${t('textbookModule.nameRequired')}`);
            failed++;
            continue;
          }

          const response = await window.electronAPI.teachers.create(
            { fullName, phone },
            user!.id
          );

          if (response.success) {
            success++;
          } else {
            errors.push(`${t('textbookModule.row')} ${i + 2}: ${fullName} - ${t('common.error')}`);
            failed++;
          }
        } catch (err: any) {
          errors.push(`${t('textbookModule.row')} ${i + 2}: ${err?.message || t('common.error')}`);
          failed++;
        }
      }

      setImportResults({ success, failed, errors });
      if (success > 0) {
        fetchTeachers();
      }
    } catch (error) {
      console.error('Import error:', error);
      setSnackbar({ open: true, message: t('common.error'), severity: 'error' });
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'fullName', headerName: t('textbookModule.teacherName'), flex: 1, minWidth: 200 },
    { field: 'phone', headerName: t('textbookModule.phone'), width: 150 },
    {
      field: 'branches',
      headerName: t('textbookModule.assignedBranches'),
      flex: 1,
      minWidth: 200,
      renderCell: (params: GridRenderCellParams) => {
        const branches = params.value as Teacher['branches'];
        if (!branches || branches.length === 0) return '-';
        return branches.map(b => `${b.grade}${b.name}`).join(', ');
      },
    },
    {
      field: 'actions',
      headerName: t('common.actions'),
      width: 120,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Box>
          <IconButton
            size="small"
            onClick={() => handleOpenDialog(params.row as Teacher)}
            color="primary"
          >
            <EditIcon />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => handleDeleteClick(params.row as Teacher)}
            color="error"
          >
            <DeleteIcon />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">{t('textbookModule.teachers')}</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<PdfIcon />}
            onClick={async () => {
              const settingsRes = await window.electronAPI.settings.get();
              const s = settingsRes.success ? settingsRes.data : null;
              await exportTeachersListPdf(teachers, s, t, i18n.language);
            }}
          >
            {t('textbookModule.teachersList')}
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => exportTeachersToExcel(teachers, t)}
          >
            {t('textbookModule.exportExcel')}
          </Button>
          {teachers.length > 0 && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteSweepIcon />}
              onClick={() => { setDeleteAllPassword(''); setDeleteAllPasswordOpen(true); }}
            >
              {t('textbookModule.deleteAllTeachers')}
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadTemplate}
          >
            {t('textbookModule.downloadTemplate')}
          </Button>
          <Button
            variant="outlined"
            startIcon={<ImportIcon />}
            onClick={() => setImportDialogOpen(true)}
          >
            {t('textbookModule.importExcel')}
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            {t('textbookModule.addTeacher')}
          </Button>
        </Box>
      </Box>

      <Paper sx={{ height: 'calc(100vh - 250px)', width: '100%' }}>
        <DataGrid
          rows={teachers}
          columns={columns}
          loading={loading}
          pageSizeOptions={[10, 25, 50]}
          initialState={{
            pagination: { paginationModel: { pageSize: 25 } },
          }}
          disableRowSelectionOnClick
        />
      </Paper>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedTeacher ? t('textbookModule.editTeacher') : t('textbookModule.addTeacher')}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={t('textbookModule.teacherName')}
            fullWidth
            required
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label={t('textbookModule.phone')}
            fullWidth
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>{t('common.cancel')}</Button>
          <Button onClick={handleSave} variant="contained">
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>{t('textbookModule.deleteTeacher')}</DialogTitle>
        <DialogContent>
          <Typography>
            {t('textbookModule.deleteTeacherConfirm', { name: selectedTeacher?.fullName })}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            {t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import Dialog */}
      <Dialog
        open={importDialogOpen}
        onClose={() => !importing && setImportDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t('textbookModule.importExcel')}</DialogTitle>
        <DialogContent>
          {importing && <LinearProgress sx={{ mb: 2 }} />}

          <Alert severity="info" sx={{ mb: 2 }}>
            {t('textbookModule.importTeachersInfo')}
          </Alert>

          <Typography variant="body2" sx={{ mb: 2 }}>
            {t('textbookModule.importColumns')}:
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('textbookModule.teacherName')}, {t('textbookModule.phone')}
          </Typography>

          <Box sx={{ mb: 2 }}>
            <input
              accept=".xlsx,.xls"
              style={{ display: 'none' }}
              id="teacher-import-file"
              type="file"
              onChange={handleFileImport}
              disabled={importing}
            />
            <label htmlFor="teacher-import-file">
              <Button
                variant="contained"
                component="span"
                startIcon={<ImportIcon />}
                disabled={importing}
              >
                {t('books.selectFile')}
              </Button>
            </label>
          </Box>

          {importResults && (
            <Box sx={{ mt: 2 }}>
              <Alert severity={importResults.failed === 0 ? 'success' : 'warning'} sx={{ mb: 2 }}>
                {t('textbookModule.importSuccess', { count: importResults.success })}
                {importResults.failed > 0 && (
                  <Typography variant="body2">
                    {t('textbookModule.importFailed', { count: importResults.failed })}
                  </Typography>
                )}
              </Alert>

              {importResults.errors.length > 0 && (
                <Box>
                  <Typography variant="subtitle2">{t('textbookModule.importErrors')}:</Typography>
                  <List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
                    {importResults.errors.map((error, index) => (
                      <ListItem key={index}>
                        <ListItemText primary={error} />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDownloadTemplate} startIcon={<DownloadIcon />}>
            {t('textbookModule.downloadTemplate')}
          </Button>
          <Button onClick={() => { setImportDialogOpen(false); setImportResults(null); }} disabled={importing}>
            {t('common.close')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete All - Password Dialog */}
      <Dialog open={deleteAllPasswordOpen} onClose={() => setDeleteAllPasswordOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('textbookModule.deleteAllTeachers')}</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>{t('textbookModule.enterPassword')}</Typography>
          <TextField
            autoFocus
            type="password"
            fullWidth
            value={deleteAllPassword}
            onChange={(e) => setDeleteAllPassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && deleteAllPassword) handleDeleteAllPassword(); }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteAllPasswordOpen(false)}>{t('common.cancel')}</Button>
          <Button onClick={handleDeleteAllPassword} color="error" variant="contained" disabled={!deleteAllPassword}>
            {t('common.confirm')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete All - Confirm Dialog */}
      <Dialog open={deleteAllConfirmOpen} onClose={() => setDeleteAllConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('textbookModule.deleteAllTeachers')}</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            {t('textbookModule.deleteAllConfirm', { count: teachers.length })}
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDeleteAllConfirmOpen(false); setDeleteAllPassword(''); }}>{t('common.cancel')}</Button>
          <Button onClick={handleDeleteAll} color="error" variant="contained">
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

export default TeachersPage;
