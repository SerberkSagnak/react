import { useState } from 'react';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import BuildIcon from '@mui/icons-material/Build';
import SourceIcon from '@mui/icons-material/Source';
import OutputIcon from '@mui/icons-material/Output';

// Yeni View bileşenlerimizi import ediyoruz
import BuilderView from './views/BuilderView.jsx';
import SourcesView from './views/SourcesView.jsx';
import DestinationsView from './views/DestinationsView.jsx';

function App() {
  const [activeView, setActiveView] = useState('builder'); // Hangi ana ekranın aktif olduğunu tutar

  // Bu fonksiyon, aktif olan view'e göre doğru bileşeni render eder.
  const renderActiveView = () => {
    switch (activeView) {
      case 'builder':
        return <BuilderView />;
      case 'sources':
        return <SourcesView />;
      case 'destinations':
        return <DestinationsView />;
      default:
        return <BuilderView />; // Varsayılan olarak her zaman builder'ı göster
    }
  };

  return (
    <Box sx={{ display: 'flex' }}>
      {/* ANA NAVİGASYON MENÜSÜ */}
      <Box sx={{
        width: 240,
        height: '100vh',
        bgcolor: '#1e2128',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0, // Kenar çubuğunun küçülmesini engeller
      }}>
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
          <ListItemText 
            primary="Flow Designer" 
            primaryTypographyProps={{ 
              fontSize: '1.2rem', 
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
            }}
          />
        </Box>
        <Divider sx={{ bgcolor: '#444' }}/>
        <List component="nav">
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
      </Box>

      {/* SEÇİLEN İÇERİK ALANI */}
      <Box component="main" sx={{ flexGrow: 1, height: '100vh', overflow: 'hidden' }}>
        {renderActiveView()}
      </Box>
    </Box>
  );
}

export default App;