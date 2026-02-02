import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  CircularProgress,
  FormHelperText,
} from '@mui/material';
import { toast } from 'react-toastify';
import { useAuthStore } from '../store/authStore';
import { BookFormData, Category } from '../types';

const BookFormPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuthStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!id);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BookFormData>({
    defaultValues: {
      title: '',
      author: '',
      isbn: '',
      publisher: '',
      year: undefined,
      categoryId: 0,
      shelfLocation: '',
      inventoryNumber: '',
      totalCopies: 1,
      notes: '',
    },
  });

  useEffect(() => {
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

    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchBook = async () => {
      if (!id) return;
      try {
        const response = await window.electronAPI.books.getById(parseInt(id));
        if (response.success && response.data) {
          reset({
            title: response.data.title,
            author: response.data.author,
            isbn: response.data.isbn || '',
            publisher: response.data.publisher || '',
            year: response.data.year || undefined,
            categoryId: response.data.categoryId,
            shelfLocation: response.data.shelfLocation || '',
            inventoryNumber: response.data.inventoryNumber,
            totalCopies: response.data.totalCopies,
            notes: response.data.notes || '',
          });
        }
      } catch (error) {
        toast.error(t('errors.general'));
      } finally {
        setInitialLoading(false);
      }
    };

    fetchBook();
  }, [id, reset, t]);

  const onSubmit = async (data: BookFormData) => {
    setLoading(true);
    try {
      const bookData = {
        ...data,
        year: data.year ? parseInt(data.year.toString()) : null,
        totalCopies: parseInt(data.totalCopies.toString()),
      };

      let response;
      if (id) {
        response = await window.electronAPI.books.update(parseInt(id), bookData, user!.id);
      } else {
        response = await window.electronAPI.books.create(bookData, user!.id);
      }

      if (response.success) {
        toast.success(t('books.saveSuccess'));
        navigate('/books');
      } else {
        if (response.error === 'INVENTORY_NUMBER_EXISTS') {
          toast.error(t('books.inventoryNumberExists'));
        } else {
          toast.error(t('errors.general'));
        }
      }
    } catch (error) {
      toast.error(t('errors.general'));
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {id ? t('books.editBook') : t('books.addBook')}
      </Typography>

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Controller
                  name="title"
                  control={control}
                  rules={{ required: t('validation.required') }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label={t('books.bookTitle')}
                      error={!!errors.title}
                      helperText={errors.title?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="author"
                  control={control}
                  rules={{ required: t('validation.required') }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label={t('books.author')}
                      error={!!errors.author}
                      helperText={errors.author?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="inventoryNumber"
                  control={control}
                  rules={{ required: t('validation.required') }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label={t('books.inventoryNumber')}
                      error={!!errors.inventoryNumber}
                      helperText={errors.inventoryNumber?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="isbn"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label={t('books.isbn')}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="categoryId"
                  control={control}
                  rules={{ required: t('validation.required'), min: { value: 1, message: t('validation.required') } }}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.categoryId}>
                      <InputLabel>{t('books.category')}</InputLabel>
                      <Select {...field} label={t('books.category')}>
                        {categories.map((cat) => (
                          <MenuItem key={cat.id} value={cat.id}>
                            {i18n.language === 'kk' ? cat.nameKk : cat.name}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.categoryId && (
                        <FormHelperText>{errors.categoryId.message}</FormHelperText>
                      )}
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="publisher"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label={t('books.publisher')}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Controller
                  name="year"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      type="number"
                      label={t('books.year')}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Controller
                  name="shelfLocation"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label={t('books.shelfLocation')}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Controller
                  name="totalCopies"
                  control={control}
                  rules={{
                    required: t('validation.required'),
                    min: { value: 1, message: t('validation.minValue', { min: 1 }) },
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      type="number"
                      label={t('books.totalCopies')}
                      error={!!errors.totalCopies}
                      helperText={errors.totalCopies?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="notes"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      multiline
                      rows={3}
                      label={t('books.notes')}
                    />
                  )}
                />
              </Grid>
            </Grid>

            <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
              <Button
                type="submit"
                variant="contained"
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : t('common.save')}
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate('/books')}
                disabled={loading}
              >
                {t('common.cancel')}
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default BookFormPage;
