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
import { UserFormData } from '../types';

const UserFormPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const { user: currentUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!id);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserFormData>({
    defaultValues: {
      username: '',
      fullName: '',
      password: '',
      role: 'LIBRARIAN',
    },
  });

  useEffect(() => {
    const fetchUser = async () => {
      if (!id) return;
      try {
        const response = await window.electronAPI.users.getAll();
        if (response.success) {
          const userData = response.data.find((u: any) => u.id === parseInt(id));
          if (userData) {
            reset({
              username: userData.username,
              fullName: userData.fullName,
              password: '',
              role: userData.role,
            });
          }
        }
      } catch (error) {
        toast.error(t('errors.general'));
      } finally {
        setInitialLoading(false);
      }
    };

    fetchUser();
  }, [id, reset, t]);

  const onSubmit = async (data: UserFormData) => {
    setLoading(true);
    try {
      let response;
      if (id) {
        const updateData: Partial<UserFormData> = {
          username: data.username,
          fullName: data.fullName,
          role: data.role,
        };
        response = await window.electronAPI.users.update(parseInt(id), updateData, currentUser!.id);
      } else {
        if (!data.password) {
          toast.error(t('validation.required'));
          setLoading(false);
          return;
        }
        response = await window.electronAPI.users.create(data, currentUser!.id);
      }

      if (response.success) {
        toast.success(t('users.saveSuccess'));
        navigate('/users');
      } else {
        if (response.error === 'USERNAME_EXISTS') {
          toast.error(t('users.usernameExists'));
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
        {id ? t('users.editUser') : t('users.addUser')}
      </Typography>

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Controller
                  name="username"
                  control={control}
                  rules={{ required: t('validation.required') }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label={t('users.username')}
                      error={!!errors.username}
                      helperText={errors.username?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="fullName"
                  control={control}
                  rules={{ required: t('validation.required') }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label={t('users.fullName')}
                      error={!!errors.fullName}
                      helperText={errors.fullName?.message}
                    />
                  )}
                />
              </Grid>
              {!id && (
                <Grid item xs={12} md={6}>
                  <Controller
                    name="password"
                    control={control}
                    rules={{
                      required: !id ? t('validation.required') : false,
                      minLength: { value: 6, message: t('validation.minLength', { min: 6 }) },
                    }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        type="password"
                        label={t('users.password')}
                        error={!!errors.password}
                        helperText={errors.password?.message}
                      />
                    )}
                  />
                </Grid>
              )}
              <Grid item xs={12} md={6}>
                <Controller
                  name="role"
                  control={control}
                  rules={{ required: t('validation.required') }}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.role}>
                      <InputLabel>{t('users.role')}</InputLabel>
                      <Select {...field} label={t('users.role')}>
                        <MenuItem value="ADMIN">{t('users.roleAdmin')}</MenuItem>
                        <MenuItem value="LIBRARIAN">{t('users.roleLibrarian')}</MenuItem>
                      </Select>
                      {errors.role && (
                        <FormHelperText>{errors.role.message}</FormHelperText>
                      )}
                    </FormControl>
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
                onClick={() => navigate('/users')}
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

export default UserFormPage;
