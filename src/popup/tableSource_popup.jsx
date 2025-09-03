// Dosya Adı: TableSourcePopup.jsx

import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  FormControl, InputLabel, Select, MenuItem, Box, Typography, Divider,
  IconButton, CircularProgress, Alert, Card, CardContent, Chip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

// --- VERİTABANI BAĞLANTILARI SİMÜLASYONU ---
// Bu, TableSource için kullanılacak sahte veridir.
const MOCK_DB_CONNECTIONS = [
  { 
    id: 'db_conn_1', 
    name: 'Production PostgreSQL DB', 
    fields: [
      { name: 'host', label: 'Host', type: 'text', defaultValue: 'prod.db.internal', disabled: true },
      { name: 'database', label: 'Database Name', type: 'text', defaultValue: 'analytics_db', disabled: true },
      { name: 'schemaName', label: 'Schema Name', type: 'text', placeholder: 'public' },
      { name: 'tableName', label: 'Table Name', type: 'text', placeholder: 'sales_data' }
    ]
  },
  { 
    id: 'db_conn_2', 
    name: 'Data Warehouse (BigQuery)', 
    fields: [
      { name: 'projectId', label: 'Project ID', type: 'text', defaultValue: 'gcp-project-123', disabled: true },
      { name: 'datasetId', label: 'Dataset ID', type: 'text', placeholder: 'marketing_reports' },
      { name: 'tableName', label: 'Table Name', type: 'text', placeholder: 'customer_acquisitions_2025' }
    ]
  }
];
// ---------------------------------


const TableSourcePopup = ({ open, onClose, onSave, initialData = {} }) => {
  
  const [formData, setFormData] = useState(initialData);
  const [dbConnections, setDbConnections] = useState([]);
  const [selectedSourceDetails, setSelectedSourceDetails] = useState({});
  const [configFields, setConfigFields] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setFormData(initialData);
  }, [initialData, open]);

  // MSSQL source'ları API'den yükle
  useEffect(() => {
    if (open) {
      setIsLoading(true);
      setError('');
      
      const fetchMssqlSources = async () => {
        try {
          const token = localStorage.getItem('authToken');
          const response = await fetch('/api/sources?type=MSSQL', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (response.ok) {
            const sources = await response.json();
            setDbConnections(sources.map(s => ({
              id: s.ID,
              name: s.NAME,
              fields: [
                { name: 'schemaName', label: 'Schema Name', type: 'text', placeholder: 'dbo' },
                { name: 'tableName', label: 'Table Name', type: 'text', placeholder: 'Users' },
                { name: 'sqlQuery', label: 'SQL Query (Optional)', type: 'text', multiline: true, placeholder: 'SELECT * FROM Users WHERE...' }
              ]
            })));
          } else {
            setError('MSSQL connections could not be loaded.');
          }
        } catch (err) {
          console.error('MSSQL sources fetch error:', err);
          setError('Connection error occurred.');
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchMssqlSources();
    }
  }, [open]);

  useEffect(() => {
    if (formData.connectionId) {
      const selected = dbConnections.find(s => s.id === formData.connectionId);
      setConfigFields(selected ? selected.fields : []);
      
      // Seçilen source'un detaylarını API'den getir
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
  }, [formData.connectionId, dbConnections]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  const renderDynamicFields = () => {
    if (!formData.connectionId) {
      return <Typography color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>Select a database connection to see properties.</Typography>;
    }
    
    return configFields.map(field => (
      <TextField
        key={field.name}
        fullWidth
        margin="dense"
        name={field.name}
        label={field.label}
        type={field.type || 'text'}
        multiline={field.multiline || false}
        rows={field.multiline ? 3 : 1}
        value={formData[field.name] || field.defaultValue || ''}
        onChange={handleChange}
        placeholder={field.placeholder || ''}
        disabled={field.disabled || false}
        variant={field.disabled ? 'filled' : 'outlined'}
      />
    ));
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Configure Table Source
        <IconButton aria-label="close" onClick={onClose} sx={{ color: (theme) => theme.palette.grey[500] }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent dividers>
        <Typography gutterBottom>
          Specify a name and database table information for this source.
        </Typography>

        <TextField
          autoFocus
          margin="dense"
          name="customName"
          label="Node Name (Optional)"
          type="text"
          fullWidth
          variant="outlined"
          value={formData.customName || ''}
          onChange={handleChange}
        />

        <FormControl fullWidth margin="normal" disabled={isLoading}>
          <InputLabel id="db-connection-label">Database Connection</InputLabel>
          <Select
            labelId="db-connection-label"
            name="connectionId"
            value={formData.connectionId || ''}
            label="Database Connection"
            onChange={handleChange}
          >
            <MenuItem value=""><em>Not Selected</em></MenuItem>
            {dbConnections.map((conn) => (
              <MenuItem key={conn.id} value={conn.id}>{conn.name}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <Divider sx={{ my: 2 }} />

        {/* Seçilen MSSQL Source Detayları */}
        {formData.connectionId && Object.keys(selectedSourceDetails).length > 0 && (
          <Card sx={{ mb: 2, boxShadow: 1 }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Selected MSSQL Connection
                </Typography>
                <Chip 
                  label="MSSQL" 
                  size="small" 
                  color="primary" 
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

        <Box sx={{ minHeight: 150 }}>
          <Typography variant="h6" gutterBottom>Table Configuration</Typography>
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

export default TableSourcePopup;