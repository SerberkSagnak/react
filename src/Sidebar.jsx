import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import EditIcon from '@mui/icons-material/Edit';

// This section is required for drag-and-drop functions
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

const Sidebar = ({ openFlows, activeFlowId, onSwitchFlow, onNewFlow, savedTemplates, onLoadTemplate }) => {
  return (
    <Box sx={{ width: 280, bgcolor: '#f7f7f7', borderRight: '1px solid #ddd', p: 2, display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold', textAlign: 'center' }}>
        Flow Designer
      </Typography>
      <Divider sx={{ mb: 2 }} />



      {/* --- SOURCES SECTION (ADDED BACK) --- */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography sx={{ fontWeight: 'bold' }}>Sources</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={nodeStyle} onDragStart={(event) => onDragStart(event, 'bapi')} draggable>BAPI</Box>
          <Box sx={nodeStyle} onDragStart={(event) => onDragStart(event, 'query')} draggable>Query</Box>
          <Box sx={nodeStyle} onDragStart={(event) => onDragStart(event, 'tableSource')} draggable>Table</Box>
        </AccordionDetails>
      </Accordion>
      
      {/* --- DESTINATIONS SECTION (ADDED BACK) --- */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography sx={{ fontWeight: 'bold' }}>Destinations</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={nodeStyle} onDragStart={(event) => onDragStart(event, 'file')} draggable>File</Box>
          <Box sx={nodeStyle} onDragStart={(event) => onDragStart(event, 'tableDestination')} draggable>Table</Box>
        </AccordionDetails>
      </Accordion>

      <Divider sx={{ my: 2 }} />

      {/* --- SAVED FLOWS SECTION --- */}
      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Saved Flows</Typography>
      <Box sx={{ overflowY: 'auto', flex: 1 }}>
        <List dense>
            {savedTemplates && savedTemplates.length > 0 ? (
                savedTemplates.map((template) => (
                    <ListItem key={template.ID} disablePadding>
                        <ListItemButton onClick={() => onLoadTemplate(template.ID, template.TEMPLATE_NAME)}>
                            <ListItemIcon sx={{ minWidth: '32px' }}><FolderOpenIcon fontSize="small" /></ListItemIcon>
                            <ListItemText primary={template.TEMPLATE_NAME} />
                        </ListItemButton>
                    </ListItem>
                ))
            ) : (
                <ListItem><ListItemText secondary="You don't have any saved flows yet." /></ListItem>
            )}
        </List>
      </Box>
    </Box>
  );
};

export default Sidebar;