import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  FormControl, InputLabel, Select, MenuItem, Box, Typography, Divider,
  IconButton, CircularProgress, Alert, Card, CardContent, Chip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

// --- DATABASE SIMULATION ---
// This mock data allows you to test the interface until your backend is ready.
// Data from the backend should be in this format.
const MOCK_SOURCES = [
  { 
    id: 'sap_conn_1', 
    name: 'SAP Production Server (PROD)', 
    fields: [
      { name: 'host', label: 'Host', type: 'text', defaultValue: '192.168.1.100', disabled: true },
      { name: 'client', label: 'Client', type: 'text', defaultValue: '800', disabled: true },
      { name: 'functionName', label: 'BAPI Function Name', type: 'text', placeholder: 'e.g., BAPI_SALESORDER_CREATE' }
    ]
  },
  { 
    id: 'sap_conn_2', 
    name: 'SAP Test Server (TEST)', 
    fields: [
      { name: 'host', label: 'Host', type: 'text', defaultValue: '10.0.0.5', disabled: true },
      { name: 'client', label: 'Client', type: 'text', defaultValue: '300', disabled: true },
      { name: 'functionName', label: 'Function Name', type: 'text', placeholder: 'e.g., BAPI_USER_GET_DETAIL' },
      { name: 'username', label: 'Test User (Optional)', type: 'text', placeholder: 'TESTUSER' }
    ]
  }
];
// ---------------------------------


const BapiPopup = ({ open, onClose, onSave, initialData = {} }) => {
  
  // === STATES ===
  const [formData, setFormData] = useState(initialData);
  const [sapConnections, setSapConnections] = useState([]);
  const [selectedSourceDetails, setSelectedSourceDetails] = useState({});
  const [configFields, setConfigFields] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // === EFFECTS ===

  // Fills the form when component opens or when initialData changes
  useEffect(() => {
    setFormData(initialData);
  }, [initialData, open]);

  // Load SAP sources from API
  useEffect(() => {
    if (open) {
      setIsLoading(true);
      setError('');
      
      const fetchSapSources = async () => {
        try {
          const token = localStorage.getItem('authToken');
          const response = await fetch('/api/sources?type=SAP', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (response.ok) {
            const sources = await response.json();
            setSapConnections(sources.map(s => ({
              id: s.ID,
              name: s.NAME,
              fields: [
                { name: 'functionName', label: 'BAPI Function Name', type: 'text', placeholder: 'e.g., BAPI_SALESORDER_CREATE' }
              ]
            })));
          } else {
            setError('Could not load SAP connections.');
          }
        } catch (err) {
          console.error('SAP sources fetch error:', err);
          setError('Connection error occurred.');
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchSapSources();
    }
  }, [open]);

  // Get details when user selects a connection
  useEffect(() => {
    if (formData.connectionId) {
      const selected = sapConnections.find(s => s.id === formData.connectionId);
      setConfigFields(selected ? selected.fields : []);
      
      // Get details of selected source from API
      const fetchSourceDetails = async () => {
        try {
          const token = localStorage.getItem('authToken');
          const response = await fetch(`/api/sources/${formData.connectionId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (response.ok) {
            const sourceData = await response.json();
            setSelectedSourceDetails(sourceData.details || {});
          }
        } catch (err) {
          console.error('Source details fetch error:', err);
        }
      };
      
      fetchSourceDetails();
    } else {
      setConfigFields([]);
      setSelectedSourceDetails({});
    }
  }, [formData.connectionId, sapConnections]);


  // === FUNCTIONS ===
  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    // Send data to be saved to parent component
    onSave(formData);
    onClose(); // Close window
  };

  // Dynamically renders form fields
  const renderDynamicFields = () => {
    if (!formData.connectionId) {
      return <Typography color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>Select a connection to see properties.</Typography>;
    }
    
    return configFields.map(field => (
      <TextField
        key={field.name}
        fullWidth
        margin="dense"
        name={field.name}
        label={field.label}
        type={field.type || 'text'}
        value={formData[field.name] || field.defaultValue || ''}
        onChange={handleChange}
        placeholder={field.placeholder || ''}
        disabled={field.disabled || false}
        variant={field.disabled ? 'filled' : 'outlined'}
      />
    ));
  };

  // === MAIN JSX STRUCTURE ===
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Configure BAPI
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ color: (theme) => theme.palette.grey[500] }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent dividers>
        <Typography gutterBottom>
          Enter a descriptive name and connection details for this step in the flow.
        </Typography>

        {/* Custom Name Field */}
        <TextField
          autoFocus
          margin="dense"
          name="customName"
          label="Node name"
          type="text"
          fullWidth
          variant="outlined"
          value={formData.customName || ''}
          onChange={handleChange}
        />

        {/* SAP Connection Dropdown */}
        <FormControl fullWidth margin="normal" disabled={isLoading}>
          <InputLabel id="sap-connection-label">SAP Connect</InputLabel>
          <Select
            labelId="sap-connection-label"
            name="connectionId"
            value={formData.connectionId || ''}
            label="SAP Connect"
            onChange={handleChange}
          >
            <MenuItem value=""><em>Not selected</em></MenuItem>
            {sapConnections.map((conn) => (
              <MenuItem key={conn.id} value={conn.id}>{conn.name}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <Divider sx={{ my: 2 }} />

        {/* Selected SAP Source Details */}
        {formData.connectionId && Object.keys(selectedSourceDetails).length > 0 && (
          <Card sx={{ mb: 2, boxShadow: 1 }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Selected SAP Connect
                </Typography>
                <Chip 
                  label="SAP" 
                  size="small" 
                  color="success" 
                  sx={{ height: 20, fontSize: '0.75rem' }}
                />
              </Box>
              
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
                gap: 1.5 
              }}>
                {Object.entries(selectedSourceDetails).map(([property, value]) => (
                  <Box 
                    key={property} 
                    sx={{ 
                      p: 1, 
                      bgcolor: '#fafafa', 
                      borderRadius: 0.5,
                      border: '1px solid #e0e0e0'
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 500 }}>
                      {property}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#1976d2' }}>
                      {property.toLowerCase().includes('password') ? '••••••••' : value}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Dynamic Fields Display Section */}
        <Box sx={{ minHeight: 150 }}>
          <Typography variant="h6" gutterBottom>BAPI Configure</Typography>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : (
            renderDynamicFields()
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: '16px 24px' }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={!formData.connectionId}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BapiPopup;