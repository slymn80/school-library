import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  IconButton,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  QrCode as BarcodeIcon,
  FileDownload as ExportIcon,
  Print as PrintIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useAuthStore } from '../store/authStore';
import { Book, Category } from '../types';
import { exportBooksToExcel } from '../utils/export';

const BooksPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<number | ''>('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null);
  const [selectedBooks, setSelectedBooks] = useState<number[]>([]);

  const fetchBooks = async () => {
    try {
      const filters: { search?: string; categoryId?: number } = {};
      if (search) filters.search = search;
      if (categoryFilter) filters.categoryId = categoryFilter;

      const response = await window.electronAPI.books.getAll(filters);
      if (response.success) {
        setBooks(response.data);
      }
    } catch (error) {
      toast.error(t('errors.general'));
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await window.electronAPI.categories.getAll();
      if (response.success) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchBooks(), fetchCategories()]);
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    fetchBooks();
  }, [search, categoryFilter]);

  const handleDelete = async () => {
    if (!bookToDelete) return;

    try {
      const response = await window.electronAPI.books.delete(bookToDelete.id, user!.id);
      if (response.success) {
        toast.success(t('books.deleteSuccess'));
        fetchBooks();
      } else {
        if (response.error === 'BOOK_HAS_ACTIVE_LOANS') {
          toast.error(t('books.hasActiveLoans'));
        } else {
          toast.error(t('errors.general'));
        }
      }
    } catch (error) {
      toast.error(t('errors.general'));
    }
    setDeleteDialogOpen(false);
    setBookToDelete(null);
  };

  const handleExport = () => {
    exportBooksToExcel(books, t, i18n.language);
  };

  const handlePrintLabels = () => {
    if (selectedBooks.length > 0) {
      const ids = selectedBooks.join(',');
      navigate(`/books/labels?ids=${ids}`);
    } else {
      navigate('/books/labels');
    }
  };

  const columns: GridColDef[] = [
    { field: 'inventoryNumber', headerName: t('books.inventoryNumber'), width: 130 },
    { field: 'title', headerName: t('books.bookTitle'), flex: 1, minWidth: 200 },
    { field: 'author', headerName: t('books.author'), width: 180 },
    {
      field: 'category',
      headerName: t('books.category'),
      width: 150,
      valueGetter: (params) => {
        const category = params.row.category;
        return i18n.language === 'kk' ? category?.nameKk : category?.name;
      },
    },
    { field: 'shelfLocation', headerName: t('books.shelfLocation'), width: 120 },
    { field: 'totalCopies', headerName: t('books.totalCopies'), width: 100 },
    { field: 'availableCopies', headerName: t('books.availableCopies'), width: 100 },
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
              onClick={() => navigate(`/books/${params.row.id}/edit`)}
            >
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('books.barcode')}>
            <IconButton
              size="small"
              onClick={() => navigate(`/books/labels?ids=${params.row.id}`)}
            >
              <BarcodeIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('common.delete')}>
            <IconButton
              size="small"
              color="error"
              onClick={() => {
                setBookToDelete(params.row);
                setDeleteDialogOpen(true);
              }}
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
        <Typography variant="h4">{t('books.title')}</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={handlePrintLabels}
          >
            {t('books.printLabels')}
          </Button>
          <Button
            variant="outlined"
            startIcon={<ExportIcon />}
            onClick={handleExport}
          >
            {t('books.exportExcel')}
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/books/new')}
          >
            {t('books.addBook')}
          </Button>
        </Box>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              label={t('common.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              size="small"
              sx={{ minWidth: 250 }}
              placeholder={t('books.bookTitle') + ', ' + t('books.author') + ', ' + t('books.inventoryNumber')}
            />
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>{t('books.category')}</InputLabel>
              <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as number | '')}
                label={t('books.category')}
              >
                <MenuItem value="">{t('books.allCategories')}</MenuItem>
                {categories.map((cat) => (
                  <MenuItem key={cat.id} value={cat.id}>
                    {i18n.language === 'kk' ? cat.nameKk : cat.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ height: 600 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <CircularProgress />
            </Box>
          ) : (
            <DataGrid
              rows={books}
              columns={columns}
              pageSizeOptions={[10, 25, 50, 100]}
              initialState={{
                pagination: { paginationModel: { pageSize: 25 } },
              }}
              checkboxSelection
              disableRowSelectionOnClick
              onRowSelectionModelChange={(newSelection) => {
                setSelectedBooks(newSelection as number[]);
              }}
              localeText={{
                noRowsLabel: t('common.noData'),
                MuiTablePagination: {
                  labelRowsPerPage: '',
                },
              }}
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>{t('books.deleteBook')}</DialogTitle>
        <DialogContent>
          <Typography>{t('books.deleteConfirm')}</Typography>
          {bookToDelete && (
            <Typography sx={{ mt: 1 }} fontWeight="bold">
              {bookToDelete.title} ({bookToDelete.inventoryNumber})
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
    </Box>
  );
};

export default BooksPage;
