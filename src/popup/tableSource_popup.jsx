// Dosya Adı: tableSource_popup.jsx
// AÇIKLAMA: Backend'e connectionType='source' parametresini gönderecek şekilde güncellendi.

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  FormControl, InputLabel, Select, MenuItem, Box, Typography, Divider,
<<<<<<< HEAD
  IconButton, CircularProgress, Alert, FormGroup, FormControlLabel, Checkbox,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper
=======
  IconButton, CircularProgress, Alert, Card, CardContent, Chip
>>>>>>> 904e9564da8463057862b46e223b41ec4fe1fe72
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

import hanaIcon from '../photo/saphana.jpeg';
import mssqlIcon from '../photo/mssql.jpeg';

const typeIcons = {
  HANA: hanaIcon,
  MSSQL: mssqlIcon,
};

const TableSourcePopup = ({ open, onClose, onSave, initialData = {} }) => {

  const [formData, setFormData] = useState({});
  const [dbConnections, setDbConnections] = useState([]);
<<<<<<< HEAD
  const [schemas, setSchemas] = useState([]);
  const [tablesAndColumns, setTablesAndColumns] = useState({});
  const [selectedTable, setSelectedTable] = useState('');
  const [selectedColumns, setSelectedColumns] = useState({});
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState({ connections: false, schemas: false, tables: false, data: false });
  const [error, setError] = useState({ connections: '', schemas: '', tables: '', data: '' });
=======
  const [selectedSourceDetails, setSelectedSourceDetails] = useState({});
  const [configFields, setConfigFields] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
>>>>>>> 904e9564da8463057862b46e223b41ec4fe1fe72

  const selectedConnection = dbConnections.find(c => c.id === Number(formData.connectionId));

<<<<<<< HEAD
  const resetDependentStates = useCallback(() => {
    setSchemas([]);
    setTablesAndColumns({});
    setSelectedTable('');
    setSelectedColumns({});
    setTableData([]);
    setError(prev => ({ ...prev, schemas: '', tables: '', data: '' }));
  }, []);

  useEffect(() => {
    if (open) {
      setFormData({
        customName: initialData.customName || '',
        connectionId: initialData.connectionId || '',
        schemaName: initialData.schemaName || '',
      });
      setSelectedTable(initialData.tableName || '');
      setSelectedColumns(initialData.selectedColumns?.reduce((acc, col) => ({...acc, [col]: true}), {}) || {});
      resetDependentStates();
=======
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
>>>>>>> 904e9564da8463057862b46e223b41ec4fe1fe72

      const fetchDbSources = async () => {
        setLoading(prev => ({ ...prev, connections: true }));
        setError(prev => ({ ...prev, connections: ''}));
        try {
          const token = localStorage.getItem('authToken');
          const response = await fetch('/api/sources', { headers: { 'Authorization': `Bearer ${token}` } });
          if (!response.ok) throw new Error('Could not load DB connections.');
          const sources = await response.json();
          const filteredSources = sources.filter(s => s.TYPE === 'HANA' || s.TYPE === 'MSSQL');
          setDbConnections(filteredSources.map(s => ({ id: s.ID, name: s.NAME, type: s.TYPE })));
        } catch (err) {
          setError(prev => ({ ...prev, connections: err.message }));
        } finally {
          setLoading(prev => ({ ...prev, connections: false }));
        }
      };
      fetchDbSources();
    }
  }, [open, initialData, resetDependentStates]);

  const handleConnectionChange = (event) => {
    const connectionId = event.target.value;
    resetDependentStates();
    setFormData(prev => ({ ...prev, connectionId: connectionId, schemaName: '', tableName: '' }));
    if (!connectionId) return;

    const connection = dbConnections.find(c => c.id === Number(connectionId));
    if (!connection) return;

    const endpoint = connection.type === 'HANA' ? '/api/hana/schemas' : '/api/mssql/schemas';
    
    const fetchSchemas = async () => {
      setLoading(prev => ({ ...prev, schemas: true }));
      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(endpoint, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, 
            body: JSON.stringify({ sourceId: connectionId, connectionType: 'source' }) // GÜNCELLENDİ
        });
        if (!response.ok) { const errData = await response.json(); throw new Error(errData.message || `Failed to fetch ${connection.type} schemas.`); }
        const schemaData = await response.json();
        setSchemas(schemaData);
      } catch (err) {
        setError(prev => ({ ...prev, schemas: err.message }));
      } finally {
        setLoading(prev => ({ ...prev, schemas: false }));
      }
    };
    fetchSchemas();
  };

  const handleSchemaChange = async (event) => {
    const schemaName = event.target.value;
    setFormData(prev => ({ ...prev, schemaName: schemaName, tableName: '' }));
    setSelectedTable('');
    setTablesAndColumns({});
    setTableData([]);
    setError(prev => ({ ...prev, tables: '', data: '' }));
    setLoading(prev => ({ ...prev, tables: true }));

    if (!selectedConnection) return;
    const endpoint = selectedConnection.type === 'HANA' ? '/api/hana/tables' : '/api/mssql/tables';

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(endpoint, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, 
          body: JSON.stringify({ sourceId: formData.connectionId, schemaName, connectionType: 'source' }) // GÜNCELLENDİ
        });
      if (!response.ok) { const errData = await response.json(); throw new Error(errData.message || `Failed to fetch ${selectedConnection.type} tables.`); }
      const tableData = await response.json();
      setTablesAndColumns(tableData);
    } catch (err) {
      setError(prev => ({ ...prev, tables: err.message }));
    } finally {
      setLoading(prev => ({ ...prev, tables: false }));
    }
  };

  const handleTableChange = (event) => {
    const tableName = event.target.value;
    setSelectedTable(tableName);
    setSelectedColumns({});
    setTableData([]);
  };

  const handleColumnToggle = (columnName) => {
    setSelectedColumns(prev => ({ ...prev, [columnName]: !prev[columnName] }));
  };

  const handleFetchData = async () => {
    if (!selectedConnection) return;
    const columnsToFetch = Object.keys(selectedColumns).filter(col => selectedColumns[col]);
    if (columnsToFetch.length === 0) { setError(prev => ({ ...prev, data: 'Please select at least one column.' })); return; }
    setLoading(prev => ({ ...prev, data: true }));
    setError(prev => ({ ...prev, data: '' }));
    setTableData([]);

    const endpoint = selectedConnection.type === 'HANA' ? '/api/hana/data' : '/api/mssql/data';

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(endpoint, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, 
          body: JSON.stringify({ 
              sourceId: formData.connectionId, 
              schemaName: formData.schemaName, 
              tableName: selectedTable, 
              columns: columnsToFetch, 
              connectionType: 'source' // GÜNCELLENDİ
            })
         });
      if (!response.ok) { const errData = await response.json(); throw new Error(errData.message || `Failed to fetch ${selectedConnection.type} data.`); }
      const data = await response.json();
      setTableData(data);
    } catch (err) {
      setError(prev => ({ ...prev, data: err.message }));
    } finally {
      setLoading(prev => ({ ...prev, data: false }));
    }
  };

  const handleSave = () => {
    const selectedCols = Object.keys(selectedColumns).filter(k => selectedColumns[k]);
    if (!selectedConnection || !formData.schemaName || !selectedTable || selectedCols.length === 0) {
        alert('Please select a connection, schema, table, and at least one column to save.');
        return;
    }
    
    onSave({ 
        ...formData, 
        tableName: selectedTable,
        selectedColumns: selectedCols
    });
    onClose();
  };

<<<<<<< HEAD
  const getSelectedColumnsCount = () => Object.values(selectedColumns).filter(Boolean).length;
=======
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
>>>>>>> 904e9564da8463057862b46e223b41ec4fe1fe72

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
<<<<<<< HEAD
        Tablo Kaynağını Yapılandır
        <IconButton aria-label="close" onClick={onClose} sx={{ color: (theme) => theme.palette.grey[500] }}><CloseIcon /></IconButton>
      </DialogTitle>
      
      <DialogContent dividers>
        <TextField autoFocus margin="dense" name="customName" label="Node Adı" type="text" fullWidth variant="outlined" value={formData.customName || ''} onChange={(e) => setFormData(p => ({...p, customName: e.target.value}))} />
        
        <FormControl fullWidth margin="normal" disabled={loading.connections}>
          <InputLabel id="db-conn-label">Database Bağlantısı</InputLabel>
          <Select labelId="db-conn-label" name="connectionId" value={formData.connectionId || ''} label="Database Connection" onChange={handleConnectionChange}>
            <MenuItem value=""><em>Seçilmedi</em></MenuItem>
=======
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
>>>>>>> 904e9564da8463057862b46e223b41ec4fe1fe72
            {dbConnections.map((conn) => (
              <MenuItem key={conn.id} value={conn.id}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <img src={typeIcons[conn.type]} alt={conn.type} style={{ width: 20, height: 20, marginRight: '10px', borderRadius: '4px' }} />
                  {conn.name}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {loading.connections && <CircularProgress size={20} />}
        {error.connections && <Alert severity="error">{error.connections}</Alert>}

        <Divider sx={{ my: 2 }} />

<<<<<<< HEAD
        {formData.connectionId && (
          <Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <FormControl fullWidth disabled={loading.schemas || schemas.length === 0}>
                <InputLabel id="schema-label">Şema</InputLabel>
                <Select labelId="schema-label" value={formData.schemaName || ''} label="Şema" onChange={handleSchemaChange}>
                <MenuItem value=""><em>{loading.schemas ? 'Yükleniyor...' : 'Select Schema'}</em></MenuItem>                  {schemas.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </Select>
                {error.schemas && <Alert severity="error" sx={{mt:1}}>{error.schemas}</Alert>}
              </FormControl>

              <FormControl fullWidth disabled={loading.tables || Object.keys(tablesAndColumns).length === 0}>
                <InputLabel id="table-label">Tablo</InputLabel>
                <Select labelId="table-label" value={selectedTable} label="Table" onChange={handleTableChange}>
                <MenuItem value=""><em>{loading.schemas ? 'Yükleniyor...' : 'Select Table'}</em></MenuItem>                  {Object.keys(tablesAndColumns).map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </Select>
                {error.tables && <Alert severity="error" sx={{mt:1}}>{error.tables}</Alert>}
              </FormControl>
=======
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
>>>>>>> 904e9564da8463057862b46e223b41ec4fe1fe72
            </Box>

            {selectedTable && tablesAndColumns[selectedTable] && (
              <Box sx={{ my: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Typography variant="subtitle1" gutterBottom>Select Column</Typography>
                <FormGroup sx={{ maxHeight: 200, overflowY: 'auto' }}>
                  {tablesAndColumns[selectedTable].map(col => (
                    <FormControlLabel key={col} control={<Checkbox checked={!!selectedColumns[col]} onChange={() => handleColumnToggle(col)} />} label={col} />
                  ))}
                </FormGroup>
                <Button onClick={handleFetchData} variant="contained" size="small" sx={{ mt: 2 }} disabled={loading.data || getSelectedColumnsCount() === 0}>
                  {loading.data ? <CircularProgress size={24} /> : `FETCH (${getSelectedColumnsCount()})`}
                </Button>
              </Box>
            )} 

            {error.data && <Alert severity="error" sx={{mt:1}}>{error.data}</Alert>}
            {tableData.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom>Veri Önizleme (50 row)</Typography>
                <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        {Object.keys(tableData[0]).map(key => <TableCell key={key} sx={{fontWeight: 'bold'}}>{key}</TableCell>)}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {tableData.slice(0, 50).map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                          {Object.values(row).map((value, cellIndex) => <TableCell key={cellIndex}>{String(value)}</TableCell>)}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: '16px 24px' }}>
<<<<<<< HEAD
        <Button onClick={onClose}>İptal</Button>
        <Button onClick={handleSave} variant="contained" disabled={!selectedTable || getSelectedColumnsCount() === 0}>
          Kaydet
=======
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={!formData.connectionId}>
          Save
>>>>>>> 904e9564da8463057862b46e223b41ec4fe1fe72
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TableSourcePopup;