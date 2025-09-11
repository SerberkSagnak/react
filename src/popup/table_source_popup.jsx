import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Box,
    Typography,
    CircularProgress,
    Snackbar,
    Alert,
    IconButton,
    List,
    ListItem,
    Checkbox,
    FormControlLabel,
    Divider,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    Paper,
    Accordion,
    AccordionSummary,
    AccordionDetails,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

/**
 * TableSource Popup
 * - Kayıtlı HANA/MSSQL connection'lardan seç
 * - Schema → Table → Column seçimi yap
 * - Seçilen data'yı kaydet
 */
export default function TableSourcePopup({ open, setOpen, onSave, initialData = null }) {
    // States
    const [loading, setLoading] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, severity: "info", message: "" });
    
    // Connection states
    const [connections, setConnections] = useState([]);
    const [selectedConnection, setSelectedConnection] = useState("");
    const [connectionData, setConnectionData] = useState(null);
    
    // Schema/Table/Column states
    const [schemas, setSchemas] = useState([]);
    const [selectedSchema, setSelectedSchema] = useState("");
    const [tables, setTables] = useState([]);
    const [selectedTable, setSelectedTable] = useState("");
    const [columns, setColumns] = useState([]);
    const [selectedColumns, setSelectedColumns] = useState({});
    
    const [loadingSchemas, setLoadingSchemas] = useState(false);
    const [loadingTables, setLoadingTables] = useState(false);
    const [loadingColumns, setLoadingColumns] = useState(false);

    // Preview states
    const [previewData, setPreviewData] = useState([]);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [showPreview, setShowPreview] = useState(false);

    // Token helper
    const getAuthToken = () => localStorage.getItem('authToken');

    // Kayıtlı connection'ları getir (sadece HANA/MSSQL)
    const fetchConnections = async () => {
        setLoading(true);
        try {
            const token = getAuthToken();
            const response = await fetch('/api/sources', {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });

            if (response.ok) {
                const data = await response.json();
                // Sadece HANA ve MSSQL connection'ları filtrele
                const dbConnections = data.filter(s => {
                    const type = (s.TYPE ?? s.type ?? "").toUpperCase();
                    return type === "HANA" || type === "MSSQL";
                }).map(s => ({
                    id: s.ID ?? s.id,
                    name: s.NAME ?? s.name,
                    type: (s.TYPE ?? s.type).toUpperCase()
                }));
                setConnections(dbConnections);
            } else {
                setSnackbar({ open: true, message: 'Connection listesi alınamadı.', severity: 'error' });
            }
        } catch (err) {
            console.error('Connection fetch error:', err);
            setSnackbar({ open: true, message: 'Sunucu ile bağlantı kurulamadı.', severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    // Connection detaylarını getir
    const fetchConnectionDetails = async (connectionId) => {
        if (!connectionId) return;

        try {
            const token = getAuthToken();
            const response = await fetch(`/api/sources/${encodeURIComponent(connectionId)}`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });

            if (response.ok) {
                const data = await response.json();
                setConnectionData(data);
                // Schema listesini getir
                fetchSchemas(data.details, data.type);
            } else {
                setSnackbar({ open: true, message: 'Connection detayları alınamadı.', severity: 'error' });
            }
        } catch (err) {
            console.error('Connection detail fetch error:', err);
            setSnackbar({ open: true, message: 'Connection detayları getirilemedi.', severity: 'error' });
        }
    };

    // Schema listesini getir
    const fetchSchemas = async (details, type) => {
        setLoadingSchemas(true);
        console.log('🔍 fetchSchemas called:', { details, type });
            console.log('🔍 Details content:', details);
        
        try {
        const token = getAuthToken();
        console.log('🔑 Token:', token ? 'EXISTS' : 'NULL');
        
        const requestBody = { details, type };
            console.log('📤 Request body full:', requestBody);
            
            const response = await fetch('/api/sources/schemas', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(requestBody),
            });
            
            console.log('📥 Response status:', response.status);
            console.log('📥 Response ok:', response.ok);

            if (response.ok) {
                const data = await response.json();
                console.log('✅ Schema data:', data);
                setSchemas(data.schemas || []);
            } else {
                const errorText = await response.text();
                console.error('❌ Schema fetch failed:', response.status, errorText);
                setSnackbar({ open: true, severity: 'error', message: `Schema hatası: ${response.status}` });
            }
        } catch (err) {
            console.error('Schema fetch error:', err);
            setSnackbar({ open: true, severity: 'error', message: 'Schema listesi getirilemedi.' });
        } finally {
            setLoadingSchemas(false);
        }
    };

    // Table listesini getir
    const fetchTables = async (schema) => {
        if (!schema || !connectionData) return;
        
        setLoadingTables(true);
        try {
            const token = getAuthToken();
            const response = await fetch('/api/sources/tables', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ 
                    details: connectionData.details, 
                    type: connectionData.type, 
                    schema 
                }),
            });

            if (response.ok) {
                const data = await response.json();
                setTables(data.tables || []);
            } else {
                setSnackbar({ open: true, severity: 'error', message: 'Table listesi alınamadı.' });
            }
        } catch (err) {
            console.error('Table fetch error:', err);
            setSnackbar({ open: true, severity: 'error', message: 'Table listesi getirilemedi.' });
        } finally {
            setLoadingTables(false);
        }
    };

    // Column listesini getir
    const fetchColumns = async (schema, table) => {
        if (!schema || !table || !connectionData) return;
        
        setLoadingColumns(true);
        try {
            const token = getAuthToken();
            const response = await fetch('/api/sources/columns', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ 
                    details: connectionData.details, 
                    type: connectionData.type, 
                    schema, 
                    table 
                }),
            });

            if (response.ok) {
                const data = await response.json();
                setColumns(data.columns || []);
                setSelectedColumns({}); // Reset selections
            } else {
                setSnackbar({ open: true, severity: 'error', message: 'Column listesi alınamadı.' });
            }
        } catch (err) {
            console.error('Column fetch error:', err);
            setSnackbar({ open: true, severity: 'error', message: 'Column listesi getirilemedi.' });
        } finally {
            setLoadingColumns(false);
        }
    };

    // Preview data fetch
    const fetchPreview = async () => {
        if (!connectionData || !selectedSchema || !selectedTable) return;
        
        const selectedColumnsArray = Object.keys(selectedColumns).filter(key => selectedColumns[key]);
        if (selectedColumnsArray.length === 0) return;
        
        setLoadingPreview(true);
        try {
            const token = getAuthToken();
            const response = await fetch('/api/sources/preview', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ 
                    details: connectionData.details, 
                    type: connectionData.type, 
                    schema: selectedSchema,
                    table: selectedTable,
                    columns: selectedColumnsArray
                }),
            });

            if (response.ok) {
                const data = await response.json();
                setPreviewData(data.data || []);
                setShowPreview(true);
            } else {
                const errorText = await response.text();
                console.error('Preview fetch failed:', response.status, errorText);
                setSnackbar({ open: true, severity: 'error', message: `Preview alınamadı: ${response.status}` });
            }
        } catch (err) {
            console.error('Preview fetch error:', err);
            setSnackbar({ open: true, severity: 'error', message: 'Preview getirilemedi.' });
        } finally {
            setLoadingPreview(false);
        }
    };

    // Popup açıldığında connection'ları getir
    useEffect(() => {
        if (open) {
            fetchConnections();
            
            // Eğer initialData varsa onu yükle
            if (initialData) {
                setSelectedConnection(initialData.connectionId || "");
                setSelectedSchema(initialData.schema || "");
                setSelectedTable(initialData.table || "");
                if (initialData.selectedColumns) {
                    const columnsObj = {};
                    initialData.selectedColumns.forEach(col => {
                        columnsObj[col] = true;
                    });
                    setSelectedColumns(columnsObj);
                }
            }
        } else {
            // Reset when closed
            resetForm();
        }
    }, [open, initialData]);

    // Form reset
    const resetForm = () => {
        setSelectedConnection("");
        setConnectionData(null);
        setSelectedSchema("");
        setSelectedTable("");
        setSchemas([]);
        setTables([]);
        setColumns([]);
        setSelectedColumns({});
    };

    // Connection seçildiğinde
    const handleConnectionChange = (connectionId) => {
        setSelectedConnection(connectionId);
        setSelectedSchema("");
        setSelectedTable("");
        setSchemas([]);
        setTables([]);
        setColumns([]);
        setSelectedColumns({});
        
        if (connectionId) {
            fetchConnectionDetails(connectionId);
        }
    };

    // Schema seçildiğinde
    const handleSchemaChange = (schema) => {
        setSelectedSchema(schema);
        setSelectedTable("");
        setTables([]);
        setColumns([]);
        setSelectedColumns({});
        
        if (schema) {
            fetchTables(schema);
        }
    };

    // Table seçildiğinde
    const handleTableChange = (table) => {
        setSelectedTable(table);
        setColumns([]);
        setSelectedColumns({});
        
        if (table && selectedSchema) {
            fetchColumns(selectedSchema, table);
        }
    };

    // Column seçimi toggle
    const handleColumnToggle = (columnName) => {
        setSelectedColumns(prev => ({
            ...prev,
            [columnName]: !prev[columnName]
        }));
    };

    // Save handler
    const handleSave = () => {
        if (!selectedConnection || !selectedSchema || !selectedTable) {
            setSnackbar({ open: true, severity: 'warning', message: 'Connection, Schema ve Table seçmelisiniz.' });
            return;
        }

        const selectedColumnsArray = Object.keys(selectedColumns).filter(key => selectedColumns[key]);
        if (selectedColumnsArray.length === 0) {
            setSnackbar({ open: true, severity: 'warning', message: 'En az bir column seçmelisiniz.' });
            return;
        }

        const tableSourceData = {
            // Connection bilgileri
            connectionId: selectedConnection,
            connectionName: connections.find(c => c.id == selectedConnection)?.name,
            connectionType: connections.find(c => c.id == selectedConnection)?.type,
            connectionDetails: connectionData.details, // Bağlantı detayları
            
            // Table bilgileri
            schema: selectedSchema,
            table: selectedTable,
            selectedColumns: selectedColumnsArray,
            fullTableName: `${selectedSchema}.${selectedTable}`,
            
            // UI için
            isConfigured: true,
            customName: `${selectedSchema}.${selectedTable} (${selectedColumnsArray.length} cols)`,
            
            // Preview data (isteğe bağlı)
            previewData: showPreview ? previewData.slice(0, 5) : null // İlk 5 satır
        };

        if (typeof onSave === "function") {
            onSave(tableSourceData);
        }
        setOpen(false);
    };

    const handleCancel = () => {
        setOpen(false);
    };

    const handleCloseSnackbar = () => setSnackbar(prev => ({ ...prev, open: false }));

    return (
        <>
            <Dialog open={open} onClose={handleCancel} maxWidth="md" fullWidth>
                <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    Table Source Configuration
                    <IconButton onClick={handleCancel} size="small">
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>

                <DialogContent dividers>
                    <Typography variant="body2" sx={{ mb: 3, color: "text.secondary" }}>
                        Select a database connection, schema, table and columns for your table source.
                    </Typography>

                    {/* Connection Selection */}
                    <Box sx={{ mb: 3 }}>
                        <FormControl fullWidth>
                            <InputLabel>Database Connection</InputLabel>
                            <Select
                                value={selectedConnection}
                                label="Database Connection"
                                onChange={(e) => handleConnectionChange(e.target.value)}
                                disabled={loading}
                            >
                                {loading ? (
                                    <MenuItem disabled>
                                        <CircularProgress size={16} /> Loading connections...
                                    </MenuItem>
                                ) : (
                                    connections.map((conn) => (
                                        <MenuItem key={conn.id} value={conn.id}>
                                            {conn.name} ({conn.type})
                                        </MenuItem>
                                    ))
                                )}
                            </Select>
                        </FormControl>
                    </Box>

                    {/* Schema Selection */}
                    {selectedConnection && (
                        <Box sx={{ mb: 3 }}>
                            <FormControl fullWidth>
                                <InputLabel>Schema</InputLabel>
                                <Select
                                    value={selectedSchema}
                                    label="Schema"
                                    onChange={(e) => handleSchemaChange(e.target.value)}
                                    disabled={loadingSchemas}
                                >
                                    {loadingSchemas ? (
                                        <MenuItem disabled>
                                            <CircularProgress size={16} /> Loading schemas...
                                        </MenuItem>
                                    ) : (
                                        schemas.map((schema) => (
                                            <MenuItem key={schema} value={schema}>
                                                {schema}
                                            </MenuItem>
                                        ))
                                    )}
                                </Select>
                            </FormControl>
                        </Box>
                    )}

                    {/* Table Selection */}
                    {selectedSchema && (
                        <Box sx={{ mb: 3 }}>
                            <FormControl fullWidth>
                                <InputLabel>Table</InputLabel>
                                <Select
                                    value={selectedTable}
                                    label="Table"
                                    onChange={(e) => handleTableChange(e.target.value)}
                                    disabled={loadingTables}
                                >
                                    {loadingTables ? (
                                        <MenuItem disabled>
                                            <CircularProgress size={16} /> Loading tables...
                                        </MenuItem>
                                    ) : (
                                        tables.map((table) => (
                                            <MenuItem key={table} value={table}>
                                                {table}
                                            </MenuItem>
                                        ))
                                    )}
                                </Select>
                            </FormControl>
                        </Box>
                    )}

                    {/* Column Selection */}
                    {selectedTable && (
                        <Box>
                            <Divider sx={{ my: 2 }} />
                            <Typography variant="h6" sx={{ mb: 2 }}>
                                Select Columns
                            </Typography>
                            
                            {loadingColumns ? (
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 2 }}>
                                    <CircularProgress size={16} />
                                    <Typography variant="body2">Loading columns...</Typography>
                                </Box>
                            ) : (
                                <>
                                    <List dense sx={{ 
                                        maxHeight: 300, 
                                        overflow: 'auto', 
                                        border: '1px solid', 
                                        borderColor: 'divider', 
                                        borderRadius: 1,
                                        bgcolor: 'grey.50'
                                    }}>
                                        {columns.map((column) => (
                                            <ListItem key={column.name} disablePadding>
                                                <FormControlLabel
                                                    control={
                                                        <Checkbox
                                                            checked={selectedColumns[column.name] || false}
                                                            onChange={() => handleColumnToggle(column.name)}
                                                            size="small"
                                                        />
                                                    }
                                                    label={
                                                        <Box>
                                                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                                {column.name}
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                {column.type}{column.length ? `(${column.length})` : ''} 
                                                                {column.nullable ? ' NULL' : ' NOT NULL'}
                                                            </Typography>
                                                        </Box>
                                                    }
                                                    sx={{ width: '100%', ml: 1 }}
                                                />
                                            </ListItem>
                                        ))}
                                        {columns.length === 0 && (
                                            <Typography variant="body2" sx={{ color: "text.secondary", textAlign: 'center', py: 2 }}>
                                                No columns found
                                            </Typography>
                                        )}
                                    </List>
                                    
                                    {/* Selected Column Count */}
                                    {Object.keys(selectedColumns).filter(key => selectedColumns[key]).length > 0 && (
                                        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 500 }}>
                                                ✓ {Object.keys(selectedColumns).filter(key => selectedColumns[key]).length} column(s) selected
                                            </Typography>
                                            <Button
                                                size="small"
                                                startIcon={loadingPreview ? <CircularProgress size={16} /> : <VisibilityIcon />}
                                                onClick={fetchPreview}
                                                disabled={loadingPreview}
                                                variant="outlined"
                                            >
                                                {loadingPreview ? 'Loading...' : 'Preview Data'}
                                            </Button>
                                        </Box>
                                    )}
                                </>
                            )}
                        </Box>
                    )}

                    {/* Data Preview */}
                    {showPreview && previewData.length > 0 && (
                        <Accordion sx={{ mt: 3 }}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Typography variant="h6">
                                    📊 Data Preview ({previewData.length} rows)
                                </Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Paper sx={{ overflow: 'auto', maxHeight: 400 }}>
                                    <Table size="small" stickyHeader>
                                        <TableHead>
                                            <TableRow>
                                                {Object.keys(selectedColumns).filter(key => selectedColumns[key]).map((column) => (
                                                    <TableCell key={column} sx={{ fontWeight: 600, bgcolor: 'primary.50' }}>
                                                        {column}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {previewData.map((row, index) => (
                                                <TableRow key={index} hover>
                                                    {Object.keys(selectedColumns).filter(key => selectedColumns[key]).map((column) => (
                                                        <TableCell key={column}>
                                                            {row[column] !== null && row[column] !== undefined 
                                                                ? String(row[column]) 
                                                                : <em style={{ color: '#999' }}>NULL</em>
                                                            }
                                                        </TableCell>
                                                    ))}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </Paper>
                            </AccordionDetails>
                        </Accordion>
                    )}
                </DialogContent>

                <DialogActions>
                    <Button onClick={handleCancel}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleSave} 
                        variant="contained"
                        disabled={
                            !selectedConnection || 
                            !selectedSchema || 
                            !selectedTable || 
                            Object.keys(selectedColumns).filter(key => selectedColumns[key]).length === 0
                        }
                    >
                        Save Table Source
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={handleCloseSnackbar}>
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </>
    );
}
