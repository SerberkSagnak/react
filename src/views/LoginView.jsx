import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Box, Button, TextField, Typography, Container, Paper, Grid } from '@mui/material';
import { useAuth } from '../context/AuthContext';

const LoginView = () => {
  const navigate = useNavigate();
  const { login } = useAuth(); // Get login function from AuthContext
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('http://localhost:3001/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        // Note: 'credentials: include' is no longer required since JWT token is sent in header.
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Login failed.');
      }

      // ***** CHANGE HERE *****
      // Take the token from the server (data.token) and pass it to the login function in AuthContext.
      login(data.token);

      // Redirect to main page
      navigate('/');

    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Paper elevation={6} sx={{ mt: 8, p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography component="h1" variant="h5">Sign In</Typography>
        <Box component="form" onSubmit={handleLogin} sx={{ mt: 1 }}>
          <TextField 
            label="USER NAME" 
            required 
            fullWidth 
            margin="normal" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            autoComplete="username"
            autoFocus
          />
          <TextField 
            label="PASSWORD" 
            type="password" 
            required 
            fullWidth 
            margin="normal" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            autoComplete="current-password"
          />
          {error && <Typography color="error" variant="body2" sx={{ mt: 1 }}>{error}</Typography>}
          <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }}>Login</Button>
          <Grid container justifyContent="flex-end">
            <Grid item><Link to="/register" variant="body2">Register Now</Link></Grid>
          </Grid>
        </Box>
      </Paper>
    </Container>
  );
};

export default LoginView;