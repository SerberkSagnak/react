import { useState } from 'react';
import Box from '@mui/material/Box';

// Yeni bileşenlerimizi import ediyoruz
import DestinationList from '../components/destinations/DestinationList';


const DestinationsView = () => {
  // Hangi görünümün aktif olduğunu tutan state: 'list' veya 'new'
  const [viewMode, setViewMode] = useState('list');

  return (
    <Box sx={{ padding: 3, width: '100%' }}>
      {viewMode === 'list' && (
        <DestinationList setViewMode={setViewMode} />
      )}

      {viewMode === 'new' && (
        <NewDestination setViewMode={setViewMode} /> // Geri dönmek için setViewMode'u buraya da ekleyebiliriz
      )}
    </Box>
  );
};

export default DestinationsView;