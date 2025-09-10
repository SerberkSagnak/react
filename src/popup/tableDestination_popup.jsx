// Dosya Adı: tableDestination_popup.jsx
// AÇIKLAMA: Backend'e connectionType='destination' parametresini gönderecek şekilde güncellendi.

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  FormControl, InputLabel, Select, MenuItem, Box, Typography, Divider,
  IconButton, CircularProgress, Alert
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

import hanaIcon from '../photo/saphana.jpeg';
import mssqlIcon from '../photo/mssql.jpeg';

const typeIcons = {
  HANA: hanaIcon,
  MSSQL: mssqlIcon,
};

const TableDestinationPopup = ({ open, onClose, onSave, initialData = {} }) => {

  const [formData, setFormData] = useState({});
  const [dbConnections, setDbConnections] = useState([]);
  const [schemas, setSchemas] = useState([]);
  const [tablesAndColumns, setTablesAndColumns] = useState({});
  const [selectedTable, setSelectedTable] = useState('');
  const [loading, setLoading] = useState({ connections: false, schemas: false, tables: false });
  const [error, setError] = useState({ connections: '', schemas: '', tables: '' });

  const selectedConnection = dbConnections.find(c => c.id === Number(formData.connectionId));

  const resetDependentStates = useCallback(() => {
    setSchemas([]);
    setTablesAndColumns({});
    setSelectedTable('');
    setError(prev => ({ ...prev, schemas: '', tables: '' }));
  }, []);

  useEffect(() => {
    if (open) {
      setFormData({
        customName: initialData.customName || '',
        connectionId: initialData.connectionId || '',
        schemaName: initialData.schemaName || '',
      });
      setSelectedTable(initialData.tableName || '');
      resetDependentStates();

      const fetchDbDestinations = async () => {
        setLoading(prev => ({ ...prev, connections: true }));
        setError(prev => ({ ...prev, connections: ''}));
        try {
          const token = localStorage.getItem('authToken');
          const response = await fetch('/api/destination', { headers: { 'Authorization': `Bearer ${token}` } });
          if (!response.ok) throw new Error('Could not load DB destinations.');
          const destinations = await response.json();
          const filteredDestinations = destinations.filter(d => d.TYPE === 'HANA' || d.TYPE === 'MSSQL');
          setDbConnections(filteredDestinations.map(d => ({ id: d.ID, name: d.NAME, type: d.TYPE })));
        } catch (err) {
          setError(prev => ({ ...prev, connections: err.message }));
        } finally {
          setLoading(prev => ({ ...prev, connections: false }));
        }
      };
      fetchDbDestinations();
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
            body: JSON.stringify({ sourceId: connectionId, connectionType: 'destination' }) // GÜNCELLENDİ
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
    setError(prev => ({ ...prev, tables: '' }));
    setLoading(prev => ({ ...prev, tables: true }));

    if (!selectedConnection) return;
    const endpoint = selectedConnection.type === 'HANA' ? '/api/hana/tables' : '/api/mssql/tables';

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(endpoint, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, 
          body: JSON.stringify({ sourceId: formData.connectionId, schemaName, connectionType: 'destination' }) // GÜNCELLENDİ
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
  };

  const handleSave = () => {
    if (!selectedConnection || !formData.schemaName || !selectedTable) {
        alert('Please select a connection, schema, and table to save.');
        return;
    }
    
    onSave({ 
        ...formData, 
        tableName: selectedTable,
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Tablo Hedefini Yapılandır
        <IconButton aria-label="close" onClick={onClose} sx={{ color: (theme) => theme.palette.grey[500] }}><CloseIcon /></IconButton>
      </DialogTitle>
      
      <DialogContent dividers>
        <TextField autoFocus margin="dense" name="customName" label="Node Adı" type="text" fullWidth variant="outlined" value={formData.customName || ''} onChange={(e) => setFormData(p => ({...p, customName: e.target.value}))} />
        
        <FormControl fullWidth margin="normal" disabled={loading.connections}>
          <InputLabel id="db-conn-label">Hedef Veritabanı Bağlantısı</InputLabel>
          <Select labelId="db-conn-label" name="connectionId" value={formData.connectionId || ''} label="Hedef Veritabanı Bağlantısı" onChange={handleConnectionChange}>
            <MenuItem value=""><em>Seçilmedi</em></MenuItem>
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

        {formData.connectionId && (
          <Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <FormControl fullWidth disabled={loading.schemas || schemas.length === 0}>
                <InputLabel id="schema-label">Hedef Şema</InputLabel>
                <Select labelId="schema-label" value={formData.schemaName || ''} label="Hedef Şema" onChange={handleSchemaChange}>
                  <MenuItem value=""><em>{loading.schemas ? 'Yükleniyor...' : 'Şema Seçin'}</em></MenuItem>
                  {schemas.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </Select>
                {error.schemas && <Alert severity="error" sx={{ mt: 1 }}>{error.schemas}</Alert>}
              </FormControl>

              <FormControl fullWidth disabled={loading.tables || Object.keys(tablesAndColumns).length === 0}>
                <InputLabel id="table-label">Hedef Tablo</InputLabel>
                <Select labelId="table-label" value={selectedTable} label="Hedef Tablo" onChange={handleTableChange}>
                  <MenuItem value=""><em>{loading.tables ? 'Yükleniyor...' : 'Tablo Seçin'}</em></MenuItem>
                  {Object.keys(tablesAndColumns).map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </Select>
                {error.tables && <Alert severity="error" sx={{ mt: 1 }}>{error.tables}</Alert>}
              </FormControl>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: '16px 24px' }}>
        <Button onClick={onClose}>İptal</Button>
        <Button onClick={handleSave} variant="contained" disabled={!selectedTable}>
          Kaydet
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TableDestinationPopup;
