import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

// Import our new components
import DestinationList from '../components/destinations/Sources';
import Sources from '../components/destinations/Sources';
const SourcesView = () => {
  // State that holds which view is active: 'list' or 'new'
  const [viewMode, setViewMode] = useState('list');

  return (
    <Box sx={{ padding: 3, width: '100%' }}>
      {viewMode === 'list' && (
        <Sources setViewMode={setViewMode} />
      )}

      {viewMode === 'new' && (
        <Sources setViewMode={setViewMode} /> // We can add setViewMode here too to go back
      )}
    </Box>
  );
};

export default SourcesView;