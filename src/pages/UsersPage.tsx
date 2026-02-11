import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Tooltip,
  Chip,
  TextField,
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  LockReset as ResetIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { format, parseISO } from 'date-fns';
import { useAuthStore } from '../store/authStore';
import { User } from '../types';

const UsersPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userToReset, setUserToReset] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const fetchUsers = async () => {
    try {
      const response = await window.electronAPI.users.getAll();
      if (response.success && response.data) {
        setUsers(response.data || []);
      } else {
        console.error('Failed to fetch users:', response.error);
        setUsers([]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error(t('errors.general'));
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async () => {
    if (!userToDelete) return;

    try {
      const response = await window.electronAPI.users.delete(userToDelete.id, currentUser!.id);
      if (response.success) {
        toast.success(t('users.deleteSuccess'));
        fetchUsers();
      } else {
        if (response.error === 'CANNOT_DELETE_ADMIN') {
          toast.error(t('users.cannotDeleteAdmin'));
        } else {
          toast.error(t('errors.general'));
        }
      }
    } catch (error) {
      toast.error(t('errors.general'));
    }
    setDeleteDialogOpen(false);
    setUserToDelete(null);
  };

  const handleResetPassword = async () => {
    if (!userToReset || !newPassword) return;

    try {
      const response = await window.electronAPI.users.resetPassword(
        userToReset.id,
        newPassword,
        currentUser!.id
      );
      if (response.success) {
        toast.success(t('users.resetSuccess'));
      } else {
        toast.error(t('errors.general'));
      }
    } catch (error) {
      toast.error(t('errors.general'));
    }
    setResetDialogOpen(false);
    setUserToReset(null);
    setNewPassword('');
  };

  const columns: GridColDef[] = [
    { field: 'username', headerName: t('users.username'), width: 150 },
    { field: 'fullName', headerName: t('users.fullName'), flex: 1, minWidth: 200 },
    {
      field: 'role',
      headerName: t('users.role'),
      width: 150,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value === 'ADMIN' ? t('users.roleAdmin') : t('users.roleLibrarian')}
          color={params.value === 'ADMIN' ? 'primary' : 'default'}
          size="small"
        />
      ),
    },
    {
      field: 'createdAt',
      headerName: t('users.createdAt'),
      width: 180,
      valueFormatter: (params) => {
        try {
          return params.value ? format(parseISO(params.value), 'dd.MM.yyyy HH:mm') : '-';
        } catch {
          return '-';
        }
      },
    },
    {
      field: 'actions',
      headerName: t('common.actions'),
      width: 150,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Box>
          <Tooltip title={t('common.edit')}>
            <IconButton
              size="small"
              onClick={() => navigate(`/users/${params.row.id}/edit`)}
            >
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('users.resetPassword')}>
            <IconButton
              size="small"
              onClick={() => {
                setUserToReset(params.row);
                setResetDialogOpen(true);
              }}
            >
              <ResetIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('common.delete')}>
            <IconButton
              size="small"
              color="error"
              onClick={() => {
                setUserToDelete(params.row);
                setDeleteDialogOpen(true);
              }}
              disabled={params.row.username === 'admin'}
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">{t('users.title')}</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/library/users/new')}
        >
          {t('users.addUser')}
        </Button>
      </Box>

      <Card>
        <CardContent>
          <Box sx={{ height: 500, width: '100%' }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress />
              </Box>
            ) : (
              <DataGrid
                rows={users}
                columns={columns}
                getRowId={(row) => row.id}
                pageSizeOptions={[10, 25]}
                initialState={{
                  pagination: { paginationModel: { pageSize: 10 } },
                }}
                disableRowSelectionOnClick
                localeText={{
                  noRowsLabel: t('common.noData'),
                  MuiTablePagination: {
                    labelRowsPerPage: '',
                  },
                }}
              />
            )}
          </Box>
        </CardContent>
      </Card>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>{t('users.deleteUser')}</DialogTitle>
        <DialogContent>
          <Typography>{t('users.deleteConfirm')}</Typography>
          {userToDelete && (
            <Typography sx={{ mt: 1 }} fontWeight="bold">
              {userToDelete.fullName} ({userToDelete.username})
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            {t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={resetDialogOpen} onClose={() => setResetDialogOpen(false)}>
        <DialogTitle>{t('users.resetPassword')}</DialogTitle>
        <DialogContent>
          {userToReset && (
            <Typography sx={{ mb: 2 }}>
              {userToReset.fullName} ({userToReset.username})
            </Typography>
          )}
          <TextField
            fullWidth
            type="password"
            label={t('users.newPassword')}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setResetDialogOpen(false);
              setNewPassword('');
            }}
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleResetPassword}
            color="primary"
            variant="contained"
            disabled={!newPassword}
          >
            {t('users.resetPassword')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UsersPage;
