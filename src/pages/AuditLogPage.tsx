import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { format, parseISO } from 'date-fns';
import { ru, kk, tr, enUS } from 'date-fns/locale';
import { toast } from 'react-toastify';
import { AuditLog } from '../types';

const AuditLogPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');

  const locale = i18n.language === 'kk' ? kk : i18n.language === 'tr' ? tr : i18n.language === 'en' ? enUS : ru;

  const actionTypes = [
    'LOGIN',
    'LOGOUT',
    'CREATE',
    'UPDATE',
    'DELETE',
    'RETURN',
    'CHANGE_PASSWORD',
    'RESET_PASSWORD',
  ];

  const entityTypes = ['USER', 'BOOK', 'STUDENT', 'LOAN', 'SETTINGS', 'CATEGORY'];

  const fetchLogs = async () => {
    try {
      const filters: { actionType?: string; entityType?: string } = {};
      if (actionFilter) filters.actionType = actionFilter;
      if (entityFilter) filters.entityType = entityFilter;

      const response = await window.electronAPI.audit.getAll(filters);
      if (response.success && response.data) {
        setLogs(response.data || []);
      } else {
        console.error('Failed to fetch audit logs:', response.error);
        setLogs([]);
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast.error(t('errors.general'));
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, entityFilter]);

  const columns: GridColDef[] = [
    {
      field: 'timestamp',
      headerName: t('audit.timestamp'),
      width: 180,
      renderCell: (params: GridRenderCellParams) => {
        try {
          const value = params.row.timestamp;
          if (!value) return '-';
          const date = typeof value === 'string' ? parseISO(value) : new Date(value);
          return format(date, 'dd.MM.yyyy HH:mm:ss', { locale });
        } catch {
          return '-';
        }
      },
    },
    {
      field: 'actorUser',
      headerName: t('audit.user'),
      width: 180,
      valueGetter: (params) => params.row.actorUser?.fullName || '-',
    },
    {
      field: 'actionType',
      headerName: t('audit.action'),
      width: 150,
      renderCell: (params: GridRenderCellParams) => (
        <Typography>
          {t(`audit.actions.${params.value}`) || params.value}
        </Typography>
      ),
    },
    {
      field: 'entityType',
      headerName: t('audit.entityType'),
      width: 150,
      renderCell: (params: GridRenderCellParams) => (
        <Typography>
          {t(`audit.entities.${params.value}`) || params.value}
        </Typography>
      ),
    },
    {
      field: 'entityId',
      headerName: t('audit.entityId'),
      width: 100,
    },
    {
      field: 'details',
      headerName: t('audit.details'),
      flex: 1,
      minWidth: 200,
      renderCell: (params: GridRenderCellParams) => {
        try {
          const details = JSON.parse(params.value);
          return (
            <Typography variant="body2" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {Object.entries(details)
                .map(([key, value]) => `${key}: ${value}`)
                .join(', ')}
            </Typography>
          );
        } catch {
          return <Typography variant="body2">{params.value}</Typography>;
        }
      },
    },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {t('audit.title')}
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>{t('audit.filterByAction')}</InputLabel>
              <Select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                label={t('audit.filterByAction')}
              >
                <MenuItem value="">{t('audit.allActions')}</MenuItem>
                {actionTypes.map((action) => (
                  <MenuItem key={action} value={action}>
                    {t(`audit.actions.${action}`) || action}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>{t('audit.filterByEntity')}</InputLabel>
              <Select
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                label={t('audit.filterByEntity')}
              >
                <MenuItem value="">{t('audit.allEntities')}</MenuItem>
                {entityTypes.map((entity) => (
                  <MenuItem key={entity} value={entity}>
                    {t(`audit.entities.${entity}`) || entity}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Box sx={{ height: 600, width: '100%' }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress />
              </Box>
            ) : (
              <DataGrid
                rows={logs}
                columns={columns}
                getRowId={(row) => row.id}
                pageSizeOptions={[10, 25, 50, 100]}
                initialState={{
                  pagination: { paginationModel: { pageSize: 25 } },
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
    </Box>
  );
};

export default AuditLogPage;
