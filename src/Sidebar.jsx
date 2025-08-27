import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';

const nodeStyle = {
  border: '1px solid #1976d2',
  color: '#1976d2',
  padding: '10px 15px',
  borderRadius: '5px',
  marginBottom: '10px',
  cursor: 'grab',
  backgroundColor: 'white',
  textAlign: 'center',
  fontWeight: 'bold'
};

const onDragStart = (event, nodeType) => {
  event.dataTransfer.setData('application/reactflow', nodeType);
  event.dataTransfer.effectAllowed = 'move';
};

const Sidebar = () => {
  return (
    <Box sx={{ width: '250px', bgcolor: '#f7f7f7', padding: '16px', borderRight: '1px solid #ddd' }}>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
        Node Library
      </Typography>
      
      <Typography variant="subtitle1" sx={{ mb: 1, color: 'text.secondary', fontWeight: 'bold' }}>
        Sources
      </Typography>
      <Box sx={nodeStyle} onDragStart={(event) => onDragStart(event, 'bapi')} draggable>
        BAPI
      </Box>
      <Box sx={nodeStyle} onDragStart={(event) => onDragStart(event, 'query')} draggable>
        Query
      </Box>
      <Box sx={nodeStyle} onDragStart={(event) => onDragStart(event, 'tableSource')} draggable>
        Table
      </Box>
      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle1" sx={{ mb: 1, color: 'text.secondary', fontWeight: 'bold' }}>
        Transformations
      </Typography>
      <Box sx={{ color: 'text.disabled', fontStyle: 'italic', mb: 1 }}>
        (Empty)
      </Box>
      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle1" sx={{ mb: 1, color: 'text.secondary', fontWeight: 'bold' }}>
        Destinations
      </Typography>
      <Box sx={nodeStyle} onDragStart={(event) => onDragStart(event, 'file')} draggable>
        File
      </Box>
      <Box sx={nodeStyle} onDragStart={(event) => onDragStart(event, 'tableDestination')} draggable>
        Table
      </Box>
    </Box>
  );
};

export default Sidebar;