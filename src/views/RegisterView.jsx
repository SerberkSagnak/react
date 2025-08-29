// src/views/RegisterView.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Box, Button, TextField, Typography, Container, Paper, Grid } from '@mui/material';

const RegisterView = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    surname: '',
    mail: '',
    phone: '',
    address: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await fetch('http://localhost:3001/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Kayıt başarısız oldu.');
      }

      setSuccess('Kayıt başarılı! Giriş sayfasına yönlendiriliyorsunuz...');
      setTimeout(() => navigate('/login'), 2000);

    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Paper elevation={6} sx={{ mt: 8, p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography component="h1" variant="h5">Sign Up</Typography>
        <Box component="form" onSubmit={handleRegister} sx={{ mt: 1 }}>
          <TextField name="username" label="Kullanıcı Adı" required fullWidth margin="normal" value={formData.username} onChange={handleChange} />
          <TextField name="surname" label="Soyadı" required fullWidth margin="normal" value={formData.surname} onChange={handleChange} />
          <TextField name="mail" label="E-posta Adresi" type="email" required fullWidth margin="normal" value={formData.mail} onChange={handleChange} />
          <TextField name="phone" label="Telefon Numarası" fullWidth margin="normal" value={formData.phone} onChange={handleChange} />
          <TextField name="address" label="Adres" fullWidth margin="normal" value={formData.address} onChange={handleChange} />
          <TextField name="password" label="Şifre" type="password" required fullWidth margin="normal" value={formData.password} onChange={handleChange} />
          {error && <Typography color="error" variant="body2" sx={{ mt: 1 }}>{error}</Typography>}
          {success && <Typography color="primary" variant="body2" sx={{ mt: 1 }}>{success}</Typography>}
          <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }}>Kayıt Ol</Button>
          <Grid container justifyContent="flex-end">
            <Grid item><Link to="/login" variant="body2">Zaten bir hesabınız var mı? Giriş Yap</Link></Grid>
          </Grid>
        </Box>
      </Paper>
    </Container>
  );
};
export default RegisterView;