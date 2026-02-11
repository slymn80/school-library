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
}

interface Branch {
  id: number;
  name: string;
  grade: number;
  teacherId: number | null;
  teacher: Teacher | null;
  studentCount: number;
  createdAt: string;
}

const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const BranchesPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    grade: 1,
    teacherId: '' as string | number,
    studentCount: 0,
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const fetchBranches = async () => {
    try {
      const response = await window.electronAPI.branches.getAll();
      if (response.success) {
        setBranches(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch branches:', error);
    } finally {
      setLoading(false);
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

  useEffect(() => {
    fetchBranches();
    fetchTeachers();
  }, []);

  const handleOpenDialog = (branch?: Branch) => {
    if (branch) {
      setSelectedBranch(branch);
      setFormData({
        name: branch.name,
        grade: branch.grade,
        teacherId: branch.teacherId || '',
        studentCount: branch.studentCount,
      });
    } else {
      setSelectedBranch(null);
      setFormData({ name: '', grade: 1, teacherId: '', studentCount: 0 });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedBranch(null);
    setFormData({ name: '', grade: 9, teacherId: '', studentCount: 0 });
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setSnackbar({ open: true, message: t('validation.required'), severity: 'error' });
      return;
    }

    try {
      const data = {
        name: formData.name,
        grade: formData.grade,
        teacherId: formData.teacherId === '' ? null : Number(formData.teacherId),
        studentCount: formData.studentCount,
      };

      let response;
      if (selectedBranch) {
        response = await window.electronAPI.branches.update(selectedBranch.id, data, user!.id);
      } else {
        response = await window.electronAPI.branches.create(data as any, user!.id);
      }

      if (response.success) {
        setSnackbar({ open: true, message: t('common.success'), severity: 'success' });
        handleCloseDialog();
        fetchBranches();
      } else {
        setSnackbar({ open: true, message: t('common.error'), severity: 'error' });
      }
    } catch (error) {
      console.error('Failed to save branch:', error);
      setSnackbar({ open: true, message: t('common.error'), severity: 'error' });
    }
  };

  const handleDeleteClick = (branch: Branch) => {
    setSelectedBranch(branch);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedBranch) return;

    try {
      const response = await window.electronAPI.branches.delete(selectedBranch.id, user!.id);
      if (response.success) {
        setSnackbar({ open: true, message: t('common.success'), severity: 'success' });
        setDeleteDialogOpen(false);
        setSelectedBranch(null);
        fetchBranches();
      } else {
        const errorMessage = response.error === 'BRANCH_HAS_DISTRIBUTIONS'
          ? t('textbookModule.branchHasDistributions')
          : t('common.error');
        setSnackbar({ open: true, message: errorMessage, severity: 'error' });
      }
    } catch (error) {
      console.error('Failed to delete branch:', error);
      setSnackbar({ open: true, message: t('common.error'), severity: 'error' });
    }
  };

  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 70 },
    {
      field: 'fullName',
      headerName: t('textbookModule.branchName'),
      flex: 1,
      minWidth: 150,
      valueGetter: (params: any) => `${params.row.grade}${params.row.name}`,
    },
    { field: 'grade', headerName: t('textbookModule.grade'), width: 100 },
    { field: 'name', headerName: t('textbookModule.branchLetter'), width: 100 },
    {
      field: 'teacher',
      headerName: t('textbookModule.classTeacher'),
      flex: 1,
      minWidth: 200,
      valueGetter: (params: any) => params.row.teacher?.fullName || '-',
    },
    {
      field: 'studentCount',
      headerName: t('textbookModule.studentCount'),
      width: 150,
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
            onClick={() => handleOpenDialog(params.row as Branch)}
            color="primary"
          >
            <EditIcon />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => handleDeleteClick(params.row as Branch)}
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
        <Typography variant="h4">{t('textbookModule.branches')}</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          {t('textbookModule.addBranch')}
        </Button>
      </Box>

      <Paper sx={{ height: 'calc(100vh - 250px)', width: '100%' }}>
        <DataGrid
          rows={branches}
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
          {selectedBranch ? t('textbookModule.editBranch') : t('textbookModule.addBranch')}
        </DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
            <InputLabel>{t('textbookModule.grade')}</InputLabel>
            <Select
              value={formData.grade}
              label={t('textbookModule.grade')}
              onChange={(e) => setFormData({ ...formData, grade: Number(e.target.value) })}
            >
              {GRADES.map((grade) => (
                <MenuItem key={grade} value={grade}>
                  {grade}. {t('textbookModule.grade')}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            margin="dense"
            label={t('textbookModule.branchLetter')}
            fullWidth
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
            placeholder="A, B, C..."
            inputProps={{ maxLength: 2 }}
            sx={{ mb: 2 }}
          />

          <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
            <InputLabel>{t('textbookModule.classTeacher')}</InputLabel>
            <Select
              value={formData.teacherId}
              label={t('textbookModule.classTeacher')}
              onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
            >
              <MenuItem value="">{t('common.noData')}</MenuItem>
              {teachers.map((teacher) => (
                <MenuItem key={teacher.id} value={teacher.id}>
                  {teacher.fullName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            margin="dense"
            label={t('textbookModule.studentCount')}
            type="number"
            fullWidth
            value={formData.studentCount}
            onChange={(e) => setFormData({ ...formData, studentCount: Math.max(0, parseInt(e.target.value) || 0) })}
            inputProps={{ min: 0 }}
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
        <DialogTitle>{t('textbookModule.deleteBranch')}</DialogTitle>
        <DialogContent>
          <Typography>
            {t('textbookModule.deleteBranchConfirm', { name: selectedBranch ? `${selectedBranch.grade}${selectedBranch.name}` : '' })}
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

export default BranchesPage;
