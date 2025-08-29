import { useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import BuildIcon from '@mui/icons-material/Build';
import SourceIcon from '@mui/icons-material/Source';
import OutputIcon from '@mui/icons-material/Output';
import LogoutIcon from '@mui/icons-material/Logout';

// View ve diğer bileşenleri import ediyoruz
import BuilderView from './views/BuilderView.jsx';
import SourcesView from './views/SourcesView.jsx';
import DestinationsView from './views/DestinationsView.jsx';
import LoginView from './views/LoginView.jsx';
import RegisterView from './views/RegisterView.jsx'; // Yeni import
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { useAuth } from './context/AuthContext.jsx';

// Ana uygulama arayüzü (eski App.jsx içeriği)
function MainLayout() {
  const [activeView, setActiveView] = useState('builder');
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const renderActiveView = () => {
    switch (activeView) {
      case 'builder': return <BuilderView />;
      case 'sources': return <SourcesView />;
      case 'destinations': return <DestinationsView />;
      default: return <BuilderView />;
    }
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <Box sx={{
        width: 240, height: '100vh', bgcolor: '#1e2128', color: '#fff',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
      }}>
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
          <ListItemText primary="Flow Designer" primaryTypographyProps={{ fontSize: '1.2rem', fontWeight: 'bold', whiteSpace: 'nowrap' }} />
        </Box>
        <Divider sx={{ bgcolor: '#444' }}/>
        <List component="nav" sx={{ flexGrow: 1 }}>
          <ListItemButton selected={activeView === 'builder'} onClick={() => setActiveView('builder')}>
            <ListItemIcon sx={{ color: 'inherit' }}><BuildIcon /></ListItemIcon>
            <ListItemText primary="Builder" />
          </ListItemButton>
          <ListItemButton selected={activeView === 'sources'} onClick={() => setActiveView('sources')}>
            <ListItemIcon sx={{ color: 'inherit' }}><SourceIcon /></ListItemIcon>
            <ListItemText primary="Sources" />
          </ListItemButton>
          <ListItemButton selected={activeView === 'destinations'} onClick={() => setActiveView('destinations')}>
            <ListItemIcon sx={{ color: 'inherit' }}><OutputIcon /></ListItemIcon>
            <ListItemText primary="Destinations" />
          </ListItemButton>
        </List>
        <Divider sx={{ bgcolor: '#444' }}/>
        <Box sx={{ p: 2 }}>
          <Button variant="contained" startIcon={<LogoutIcon />} onClick={handleLogout} fullWidth>
            Logout
          </Button>
        </Box>
      </Box>

      <Box component="main" sx={{ flexGrow: 1, height: '100vh', overflow: 'hidden' }}>
        {renderActiveView()}
      </Box>
    </Box>
  );
}

// Yeni App bileşeni sadece yönlendirme mantığını içerir
function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginView />} />
      <Route path="/register" element={<RegisterView />} /> {/* Yeni Rota */}
      <Route element={<ProtectedRoute />}>
        <Route path="/*" element={<MainLayout />} />
      </Route>
    </Routes>
  );
}

export default App;
