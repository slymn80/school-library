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
  List,
  ListItem,
  ListItemText,
  Checkbox,
  Chip,
  Divider,
  Grid,
  Card,
  CardContent,
  CardActions,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Book as BookIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../../store/authStore';

interface Textbook {
  id: number;
  title: string;
  subject: string;
  grade: number;
}

interface TextbookSetItem {
  id: number;
  textbookId: number;
  textbook: Textbook;
}

interface TextbookSet {
  id: number;
  name: string;
  grade: number;
  items: TextbookSetItem[];
  createdAt: string;
}

const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const SetsPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [sets, setSets] = useState<TextbookSet[]>([]);
  const [textbooks, setTextbooks] = useState<Textbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [selectedSet, setSelectedSet] = useState<TextbookSet | null>(null);
  const [formData, setFormData] = useState({ name: '', grade: 1 });
  const [selectedTextbooks, setSelectedTextbooks] = useState<number[]>([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const fetchSets = async () => {
    try {
      const response = await window.electronAPI.textbookSets.getAll();
      if (response.success) {
        setSets(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch sets:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTextbooks = async (grade?: number) => {
    try {
      const response = await window.electronAPI.textbooks.getAll(grade ? { grade } : undefined);
      if (response.success) {
        setTextbooks(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch textbooks:', error);
    }
  };

  useEffect(() => {
    fetchSets();
    fetchTextbooks();
  }, []);

  const handleOpenDialog = (set?: TextbookSet) => {
    if (set) {
      setSelectedSet(set);
      setFormData({ name: set.name, grade: set.grade });
    } else {
      setSelectedSet(null);
      setFormData({ name: '', grade: 1 });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedSet(null);
    setFormData({ name: '', grade: 9 });
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setSnackbar({ open: true, message: t('validation.required'), severity: 'error' });
      return;
    }

    try {
      let response;
      if (selectedSet) {
        response = await window.electronAPI.textbookSets.update(selectedSet.id, formData, user!.id);
      } else {
        response = await window.electronAPI.textbookSets.create(formData, user!.id);
      }

      if (response.success) {
        setSnackbar({ open: true, message: t('common.success'), severity: 'success' });
        handleCloseDialog();
        fetchSets();
      } else {
        setSnackbar({ open: true, message: t('common.error'), severity: 'error' });
      }
    } catch (error) {
      console.error('Failed to save set:', error);
      setSnackbar({ open: true, message: t('common.error'), severity: 'error' });
    }
  };

  const handleDeleteClick = (set: TextbookSet) => {
    setSelectedSet(set);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedSet) return;

    try {
      const response = await window.electronAPI.textbookSets.delete(selectedSet.id, user!.id);
      if (response.success) {
        setSnackbar({ open: true, message: t('common.success'), severity: 'success' });
        setDeleteDialogOpen(false);
        setSelectedSet(null);
        fetchSets();
      } else {
        const errorMessage = response.error === 'SET_HAS_DISTRIBUTIONS'
          ? t('textbookModule.setHasDistributions')
          : t('common.error');
        setSnackbar({ open: true, message: errorMessage, severity: 'error' });
      }
    } catch (error) {
      console.error('Failed to delete set:', error);
      setSnackbar({ open: true, message: t('common.error'), severity: 'error' });
    }
  };

  const handleOpenManageDialog = async (set: TextbookSet) => {
    setSelectedSet(set);
    await fetchTextbooks(set.grade);
    setSelectedTextbooks(set.items.map(item => item.textbookId));
    setManageDialogOpen(true);
  };

  const handleCloseManageDialog = () => {
    setManageDialogOpen(false);
    setSelectedSet(null);
    setSelectedTextbooks([]);
  };

  const handleToggleTextbook = async (textbookId: number) => {
    if (!selectedSet) return;

    const isSelected = selectedTextbooks.includes(textbookId);

    try {
      let response;
      if (isSelected) {
        response = await window.electronAPI.textbookSets.removeTextbook(selectedSet.id, textbookId, user!.id);
      } else {
        response = await window.electronAPI.textbookSets.addTextbook(selectedSet.id, textbookId, user!.id);
      }

      if (response.success) {
        if (isSelected) {
          setSelectedTextbooks(selectedTextbooks.filter(id => id !== textbookId));
        } else {
          setSelectedTextbooks([...selectedTextbooks, textbookId]);
        }
        fetchSets();
      } else {
        setSnackbar({ open: true, message: t('common.error'), severity: 'error' });
      }
    } catch (error) {
      console.error('Failed to toggle textbook:', error);
      setSnackbar({ open: true, message: t('common.error'), severity: 'error' });
    }
  };

  if (loading) {
    return <Typography>{t('common.loading')}</Typography>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">{t('textbookModule.sets')}</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          {t('textbookModule.addSet')}
        </Button>
      </Box>

      {sets.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">{t('common.noData')}</Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {sets.map((set) => (
            <Grid item xs={12} sm={6} md={4} key={set.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {set.name}
                  </Typography>
                  <Chip
                    label={`${set.grade}. ${t('textbookModule.grade')}`}
                    size="small"
                    sx={{ mb: 2 }}
                  />
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {t('textbookModule.textbooks')}: {set.items.length}
                  </Typography>
                  {set.items.length > 0 && (
                    <Box sx={{ mt: 1, maxHeight: 150, overflow: 'auto' }}>
                      {set.items.map((item) => (
                        <Box key={item.id} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                          <BookIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                          <Typography variant="body2" noWrap>
                            {item.textbook.title}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  )}
                </CardContent>
                <CardActions>
                  <Button size="small" onClick={() => handleOpenManageDialog(set)}>
                    {t('textbookModule.manageTextbooks')}
                  </Button>
                  <IconButton size="small" onClick={() => handleOpenDialog(set)} color="primary">
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDeleteClick(set)} color="error">
                    <DeleteIcon />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedSet ? t('textbookModule.editSet') : t('textbookModule.addSet')}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={t('textbookModule.setName')}
            fullWidth
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            sx={{ mb: 2 }}
          />

          <FormControl fullWidth margin="dense">
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
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>{t('common.cancel')}</Button>
          <Button onClick={handleSave} variant="contained">
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Manage Textbooks Dialog */}
      <Dialog open={manageDialogOpen} onClose={handleCloseManageDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {t('textbookModule.manageSetTextbooks')} - {selectedSet?.name}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('textbookModule.selectTextbooksForSet')}
          </Typography>
          {textbooks.filter(tb => tb.grade === selectedSet?.grade).length === 0 ? (
            <Typography color="text.secondary">{t('textbookModule.noTextbooksForGrade')}</Typography>
          ) : (
            <List>
              {textbooks
                .filter(tb => tb.grade === selectedSet?.grade)
                .map((textbook) => (
                  <ListItem key={textbook.id} dense>
                    <Checkbox
                      edge="start"
                      checked={selectedTextbooks.includes(textbook.id)}
                      onChange={() => handleToggleTextbook(textbook.id)}
                    />
                    <ListItemText
                      primary={textbook.title}
                      secondary={textbook.subject}
                    />
                  </ListItem>
                ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseManageDialog}>{t('common.close')}</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>{t('textbookModule.deleteSet')}</DialogTitle>
        <DialogContent>
          <Typography>
            {t('textbookModule.deleteSetConfirm', { name: selectedSet?.name })}
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

export default SetsPage;
