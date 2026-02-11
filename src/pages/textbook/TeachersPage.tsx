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
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../../store/authStore';

interface Teacher {
  id: number;
  fullName: string;
  phone: string | null;
  branches: { id: number; name: string; grade: number }[];
  createdAt: string;
}

const TeachersPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [formData, setFormData] = useState({ fullName: '', phone: '' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

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
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          {t('textbookModule.addTeacher')}
        </Button>
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
