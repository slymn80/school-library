import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
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
  Alert,
  IconButton,
  Avatar,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { toast } from 'react-toastify';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuthStore } from '../store/authStore';
import { BookFormData, Category } from '../types';

const BOOK_LANGUAGES = [
  { value: 'kk', label: 'Қазақша' },
  { value: 'ru', label: 'Русский' },
  { value: 'en', label: 'English' },
  { value: 'tr', label: 'Türkçe' },
  { value: 'other', label: 'Басқа / Другой / Other' },
];

const ACQUISITION_TYPES = ['purchase', 'donation', 'grant'] as const;
const BOOK_CONDITIONS = ['good', 'worn', 'damaged', 'lost', 'repair'] as const;

const BookFormPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!id);
  const [fromScan, setFromScan] = useState(false);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    control,
    handleSubmit,
    reset,
    watch,
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
      language: 'ru',
      acquisitionType: 'purchase',
      donorName: '',
      acquisitionDate: '',
      condition: 'good',
    },
  });

  const acquisitionType = watch('acquisitionType');

  const handleCoverImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error(t('books.imageTooLarge'));
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveCoverImage = () => {
    setCoverImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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

    // Check for scanned book data
    if (searchParams.get('fromScan') === 'true') {
      const scannedData = sessionStorage.getItem('scannedBookData');
      if (scannedData) {
        try {
          const bookInfo = JSON.parse(scannedData);
          setFromScan(true);
          reset({
            title: bookInfo.title || '',
            author: bookInfo.author || '',
            isbn: bookInfo.isbn || '',
            publisher: bookInfo.publisher || '',
            year: bookInfo.year || undefined,
            categoryId: 0,
            shelfLocation: '',
            inventoryNumber: '',
            totalCopies: 1,
            notes: '',
            language: 'ru',
            acquisitionType: 'purchase',
            donorName: '',
            acquisitionDate: '',
            condition: 'good',
          });
          setCoverImage(null);
          sessionStorage.removeItem('scannedBookData');
        } catch (e) {
          console.error('Error parsing scanned data:', e);
        }
      }
    }
  }, [searchParams, reset]);

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
            language: response.data.language || 'ru',
            acquisitionType: response.data.acquisitionType || 'purchase',
            donorName: response.data.donorName || '',
            acquisitionDate: response.data.acquisitionDate || '',
            condition: response.data.condition || 'good',
          });
          setCoverImage(response.data.coverImage || null);
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
      const showDonorFields = data.acquisitionType === 'donation' || data.acquisitionType === 'grant';
      const bookData = {
        ...data,
        year: data.year ? parseInt(data.year.toString()) : null,
        totalCopies: parseInt(data.totalCopies.toString()),
        coverImage: coverImage || null,
        acquisitionType: data.acquisitionType || 'purchase',
        donorName: showDonorFields ? data.donorName : null,
        acquisitionDate: showDonorFields && data.acquisitionDate ? new Date(data.acquisitionDate) : null,
        condition: data.condition || 'good',
      };

      let response;
      if (id) {
        response = await window.electronAPI.books.update(parseInt(id), bookData, user!.id);
      } else {
        response = await window.electronAPI.books.create(bookData, user!.id);
      }

      if (response.success) {
        toast.success(t('books.saveSuccess'));
        navigate('/library/books');
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

      {fromScan && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t('books.scannedBookInfo')}
        </Alert>
      )}

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Grid container spacing={3}>
              {/* Cover Image Upload */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <Avatar
                    src={coverImage || undefined}
                    variant="rounded"
                    sx={{ width: 120, height: 160, bgcolor: 'grey.200' }}
                  >
                    {!coverImage && <PhotoCameraIcon sx={{ fontSize: 40, color: 'grey.400' }} />}
                  </Avatar>
                  <Box>
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      ref={fileInputRef}
                      onChange={handleCoverImageUpload}
                    />
                    <Button
                      variant="outlined"
                      startIcon={<PhotoCameraIcon />}
                      onClick={() => fileInputRef.current?.click()}
                      sx={{ mb: 1 }}
                    >
                      {t('books.uploadCover')}
                    </Button>
                    {coverImage && (
                      <Box>
                        <IconButton
                          color="error"
                          onClick={handleRemoveCoverImage}
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                        <Typography variant="caption" color="text.secondary">
                          {t('books.removeCover')}
                        </Typography>
                      </Box>
                    )}
                    <Typography variant="caption" display="block" color="text.secondary">
                      {t('books.coverImageHint')}
                    </Typography>
                  </Box>
                </Box>
              </Grid>

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
                  name="language"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>{t('books.language')}</InputLabel>
                      <Select {...field} label={t('books.language')}>
                        {BOOK_LANGUAGES.map((lang) => (
                          <MenuItem key={lang.value} value={lang.value}>
                            {lang.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
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

              {/* Acquisition and Condition Section */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                  {t('books.acquisitionInfo')}
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Controller
                  name="acquisitionType"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>{t('books.acquisitionType')}</InputLabel>
                      <Select {...field} label={t('books.acquisitionType')}>
                        {ACQUISITION_TYPES.map((type) => (
                          <MenuItem key={type} value={type}>
                            {t(`books.acquisitionTypes.${type}`)}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Controller
                  name="condition"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>{t('books.condition')}</InputLabel>
                      <Select {...field} label={t('books.condition')}>
                        {BOOK_CONDITIONS.map((cond) => (
                          <MenuItem key={cond} value={cond}>
                            {t(`books.conditions.${cond}`)}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <Controller
                    name="acquisitionDate"
                    control={control}
                    render={({ field }) => (
                      <DatePicker
                        label={t('books.acquisitionDate')}
                        value={field.value ? new Date(field.value) : null}
                        onChange={(date) => field.onChange(date?.toISOString() || '')}
                        slotProps={{
                          textField: { fullWidth: true }
                        }}
                      />
                    )}
                  />
                </LocalizationProvider>
              </Grid>
              {(acquisitionType === 'donation' || acquisitionType === 'grant') && (
                <Grid item xs={12} md={4}>
                  <Controller
                    name="donorName"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label={t('books.donorName')}
                      />
                    )}
                  />
                </Grid>
              )}
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
                onClick={() => navigate('/library/books')}
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
