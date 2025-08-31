import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

// Yeni bileşenlerimizi import ediyoruz
import DestinationList from '../components/destinations/Sources';
import Sources from '../components/destinations/Sources';
const SourcesView = () => {
  // Hangi görünümün aktif olduğunu tutan state: 'list' veya 'new'
  const [viewMode, setViewMode] = useState('list');

  return (
    <Box sx={{ padding: 3, width: '100%' }}>
      {viewMode === 'list' && (
        <Sources setViewMode={setViewMode} />
      )}

      {viewMode === 'new' && (
        <Sources setViewMode={setViewMode} /> // Geri dönmek için setViewMode'u buraya da ekleyebiliriz
      )}
    </Box>
  );
};

export default SourcesView;