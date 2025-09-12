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
    Grid,
    Paper,
    Divider,
    Chip,
    TextField,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

/**
 * TableDestination Popup
 * - Kayıtlı destination connection'lardan seç
 * - Schema → Table seçimi yap
 * - Source column'larını destination column'larına map et
 * - Mapping data'sını kaydet
 */
export default function TableDestinationPopup({ open, setOpen, onSave, sourceData = null, initialData = null }) {
    // States
    const [loading, setLoading] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, severity: "info", message: "" });
    
    // Connection states
    const [connections, setConnections] = useState([]);
    const [selectedConnection, setSelectedConnection] = useState("");
    const [connectionData, setConnectionData] = useState(null);
    const [connectionPassword, setConnectionPassword] = useState(""); // Passwo rd re-enter
    
    // Schema/Table/Column states
    const [schemas, setSchemas] = useState([]);
    const [selectedSchema, setSelectedSchema] = useState("");
    const [tables, setTables] = useState([]);
    const [selectedTable, setSelectedTable] = useState("");
    const [destColumns, setDestColumns] = useState([]);
    
    // Mapping state
    const [columnMappings, setColumnMappings] = useState({});
    
    const [loadingSchemas, setLoadingSchemas] = useState(false);
    const [loadingTables, setLoadingTables] = useState(false);
    const [loadingColumns, setLoadingColumns] = useState(false);

    // Token helper
    const getAuthToken = () => localStorage.getItem('authToken');

    // Kayıtlı destination connection'ları getir (sadece HANA/MSSQL)
    const fetchConnections = async () => {
        setLoading(true);
        try {
            const token = getAuthToken();
            const response = await fetch('/api/destination', { // destination endpoint
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });

            if (response.ok) {
                const data = await response.json();
                // Sadece HANA ve MSSQL destination'ları filtrele
                const dbConnections = data.filter(d => {
                    const type = (d.TYPE ?? d.type ?? "").toUpperCase();
                    return type === "HANA" || type === "MSSQL";
                }).map(d => ({
                    id: d.ID ?? d.id,
                    name: d.NAME ?? d.name,
                    type: (d.TYPE ?? d.type).toUpperCase()
                }));
                setConnections(dbConnections);
            } else {
                setSnackbar({ open: true, message: 'Destination listesi alınamadı.', severity: 'error' });
            }
        } catch (err) {
            console.error('Destination fetch error:', err);
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
            const response = await fetch(`/api/destination/${encodeURIComponent(connectionId)}`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });

            if (response.ok) {
                const data = await response.json();
                console.log('🔍 Destination connection data:', data);
                console.log('🔍 Details structure:', data.details);
                console.log('🔍 Details keys:', Object.keys(data.details || {}));
                setConnectionData(data);
                // Schema listesini otomatik getir
                fetchSchemas(data.details, data.type);
            } else {
                setSnackbar({ open: true, message: 'Destination detayları alınamadı.', severity: 'error' });
            }
        } catch (err) {
            console.error('Destination detail fetch error:', err);
            setSnackbar({ open: true, message: 'Destination detayları getirilemedi.', severity: 'error' });
        }
    };

    // Schema listesini getir
    const fetchSchemas = async (details, type) => {
        setLoadingSchemas(true);
        try {
            const token = getAuthToken();
            const response = await fetch('/api/sources/schemas', { // test edilmiş endpoint kullan
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ details, type }),
            });

            if (response.ok) {
                const data = await response.json();
                setSchemas(data.schemas || []);
            } else {
                setSnackbar({ open: true, severity: 'error', message: 'Schema listesi alınamadı.' });
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
            const response = await fetch('/api/sources/tables', { // test edilmiş endpoint kullan
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

    // Destination table column'larını getir
    const fetchDestColumns = async (schema, table) => {
        if (!schema || !table || !connectionData) return;
        
        setLoadingColumns(true);
        try {
            const token = getAuthToken();
            const response = await fetch('/api/sources/columns', { // test edilmiş endpoint kullan
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
                setDestColumns(data.columns || []);
                // Mapping'leri sıfırla
                setColumnMappings({});
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

    // Popup açıldığında
    useEffect(() => {
        if (open) {
            fetchConnections();
            
            // Eğer initialData varsa onu yükle
            if (initialData) {
                setSelectedConnection(initialData.connectionId || "");
                setSelectedSchema(initialData.schema || "");
                setSelectedTable(initialData.table || "");
                setColumnMappings(initialData.columnMappings || {});
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
        setDestColumns([]);
        setColumnMappings({});
    };

    // Connection seçildiğinde
    const handleConnectionChange = (connectionId) => {
        setSelectedConnection(connectionId);
        setSelectedSchema("");
        setSelectedTable("");
        setSchemas([]);
        setTables([]);
        setDestColumns([]);
        setColumnMappings({});
        
        if (connectionId) {
            fetchConnectionDetails(connectionId);
        }
    };

    // Schema seçildiğinde
    const handleSchemaChange = (schema) => {
        setSelectedSchema(schema);
        setSelectedTable("");
        setTables([]);
        setDestColumns([]);
        setColumnMappings({});
        
        if (schema) {
            fetchTables(schema);
        }
    };

    // Table seçildiğinde
    const handleTableChange = (table) => {
        setSelectedTable(table);
        setDestColumns([]);
        setColumnMappings({});
        
        if (table && selectedSchema) {
            fetchDestColumns(selectedSchema, table);
        }
    };

    // Column mapping değiştiğinde
    const handleMappingChange = (sourceColumn, destinationColumn) => {
        setColumnMappings(prev => ({
            ...prev,
            [sourceColumn]: destinationColumn
        }));
    };

    // Save handler
    const handleSave = () => {
        if (!selectedConnection || !selectedSchema || !selectedTable) {
            setSnackbar({ open: true, severity: 'warning', message: 'Connection, Schema ve Table seçmelisiniz.' });
            return;
        }

        if (!sourceData || !sourceData.selectedColumns || sourceData.selectedColumns.length === 0) {
            setSnackbar({ open: true, severity: 'warning', message: 'Source data bulunamadı.' });
            return;
        }

        // En az bir mapping yapılmış mı kontrol et
        const mappedColumns = Object.keys(columnMappings).filter(key => columnMappings[key]);
        if (mappedColumns.length === 0) {
            setSnackbar({ open: true, severity: 'warning', message: 'En az bir column mapping yapmalısınız.' });
            return;
        }

        const destinationData = {
            // Connection bilgileri
            connectionId: selectedConnection,
            connectionName: connections.find(c => c.id == selectedConnection)?.name,
            connectionType: connections.find(c => c.id == selectedConnection)?.type,
            connectionDetails: connectionData.details, // Destination bağlantı detayları
            
            // Table bilgileri
            schema: selectedSchema,
            table: selectedTable,
            fullTableName: `${selectedSchema}.${selectedTable}`,
            
            // Mapping bilgileri
            columnMappings: columnMappings, // { sourceColumn: destColumn }
            sourceData: sourceData, // Source'dan gelen tüm data
            
            // UI için
            isConfigured: true,
            customName: `→ ${selectedSchema}.${selectedTable} (${Object.keys(columnMappings).filter(key => columnMappings[key]).length} mapped)`,
            
            // Transfer detayları (Run Flow için)
            transferConfig: {
                sourceConnection: sourceData?.connectionDetails,
                sourceTable: sourceData?.fullTableName,
                sourceColumns: sourceData?.selectedColumns,
                destinationConnection: connectionData.details,
                destinationTable: `${selectedSchema}.${selectedTable}`,
                mappedColumns: Object.keys(columnMappings).filter(key => columnMappings[key]).length,
                transferQuery: generateTransferQuery()
            }
        };

        function generateTransferQuery() {
            if (!sourceData || !connectionData) return '';
            
            const mappedCols = Object.keys(columnMappings).filter(key => columnMappings[key]);
            const sourceList = mappedCols.join(', ');
            const destList = mappedCols.map(col => columnMappings[col]).join(', ');
            
            if (connectionData.type === "MSSQL") {
                return `INSERT INTO [${selectedSchema}].[${selectedTable}] (${destList}) SELECT ${sourceList} FROM [SOURCE_TABLE]`;
            } else { // HANA
                return `INSERT INTO "${selectedSchema}"."${selectedTable}" (${destList}) SELECT ${sourceList} FROM "SOURCE_TABLE"`;
            }
        }

        if (typeof onSave === "function") {
            onSave(destinationData);
        }
        setOpen(false);
    };

    const handleCancel = () => setOpen(false);
    const handleCloseSnackbar = () => setSnackbar(prev => ({ ...prev, open: false }));

    return (
        <>
            <Dialog open={open} onClose={handleCancel} maxWidth="lg" fullWidth>
                <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Typography variant="h6">Table Destination Configuration</Typography>
                    <IconButton onClick={handleCancel} size="small">
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>

                <DialogContent dividers>
                    <Typography variant="body2" sx={{ mb: 3, color: "text.secondary" }}>
                        Select a destination database and map source columns to destination columns.
                    </Typography>

                    {/* Source Data Info */}
                    {sourceData && (
                        <Paper sx={{ p: 2, mb: 3, bgcolor: 'info.50', border: '1px solid', borderColor: 'info.main' }}>
                            <Typography variant="subtitle1" sx={{ mb: 1, color: 'info.dark', fontWeight: 600 }}>
                                📊 Source Table: {sourceData.fullTableName}
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {sourceData.selectedColumns?.map((col, index) => (
                                    <Chip key={index} label={col} size="small" color="info" variant="outlined" />
                                ))}
                            </Box>
                        </Paper>
                    )}

                    {/* Destination Connection Selection */}
                    <Box sx={{ mb: 3 }}>
                        <FormControl fullWidth>
                            <InputLabel>Destination Connection</InputLabel>
                            <Select
                                value={selectedConnection}
                                label="Destination Connection"
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
                                <InputLabel>Destination Table</InputLabel>
                                <Select
                                    value={selectedTable}
                                    label="Destination Table"
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

                    {/* Column Mapping */}
                    {selectedTable && (
                        <Box>
                            <Divider sx={{ my: 2 }} />
                            <Typography variant="h6" sx={{ mb: 2 }}>
                                Column Mapping
                            </Typography>
                            
                            {loadingColumns ? (
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 4 }}>
                                    <CircularProgress size={16} />
                                    <Typography variant="body2">Loading destination columns...</Typography>
                                </Box>
                            ) : (
                                <Grid container spacing={2}>
                                    {/* Source Columns */}
                                    <Grid item xs={5}>
                                        <Paper sx={{ p: 2, bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.main' }}>
                                            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                                                Source Columns
                                            </Typography>
                                            <List dense>
                                                {sourceData?.selectedColumns?.map((sourceCol, index) => (
                                                    <ListItem key={index} sx={{ px: 1 }}>
                                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                            {sourceCol}
                                                        </Typography>
                                                    </ListItem>
                                                ))}
                                            </List>
                                        </Paper>
                                    </Grid>

                                    {/* Arrow */}
                                    <Grid item xs={2} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                        <ArrowForwardIcon sx={{ fontSize: 32, color: 'primary.main' }} />
                                    </Grid>

                                    {/* Destination Columns */}
                                    <Grid item xs={5}>
                                        <Paper sx={{ p: 2, bgcolor: 'success.50', border: '1px solid', borderColor: 'success.main' }}>
                                            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                                                Destination Columns
                                            </Typography>
                                            <List dense>
                                                {destColumns.map((destCol, index) => (
                                                    <ListItem key={index} sx={{ px: 1 }}>
                                                        <Box sx={{ width: '100%' }}>
                                                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                                {destCol.name}
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                {destCol.type}{destCol.length ? `(${destCol.length})` : ''}
                                                            </Typography>
                                                        </Box>
                                                    </ListItem>
                                                ))}
                                            </List>
                                        </Paper>
                                    </Grid>
                                </Grid>
                            )}

                            {/* Mapping Controls */}
                            {destColumns.length > 0 && sourceData?.selectedColumns && (
                                <Box sx={{ mt: 3 }}>
                                    <Typography variant="subtitle2" sx={{ mb: 2 }}>
                                        Map Source → Destination:
                                    </Typography>
                                    {sourceData.selectedColumns.map((sourceCol) => (
                                        <Box key={sourceCol} sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
                                            <Typography variant="body2" sx={{ minWidth: 120, fontWeight: 500 }}>
                                                {sourceCol}
                                            </Typography>
                                            <ArrowForwardIcon sx={{ color: 'text.secondary' }} />
                                            <FormControl size="small" sx={{ minWidth: 200 }}>
                                                <InputLabel>Select destination column</InputLabel>
                                                <Select
                                                    value={columnMappings[sourceCol] || ""}
                                                    label="Select destination column"
                                                    onChange={(e) => handleMappingChange(sourceCol, e.target.value)}
                                                >
                                                    <MenuItem value="">
                                                        <em>No mapping</em>
                                                    </MenuItem>
                                                    {destColumns.map((destCol) => (
                                                        <MenuItem key={destCol.name} value={destCol.name}>
                                                            {destCol.name} ({destCol.type})
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        </Box>
                                    ))}
                                    
                                    {/* Mapping Summary */}
                                    {Object.keys(columnMappings).filter(key => columnMappings[key]).length > 0 && (
                                        <Box sx={{ mt: 2, p: 2, bgcolor: 'success.50', borderRadius: 1, border: '1px solid', borderColor: 'success.main' }}>
                                            <Typography variant="body2" sx={{ color: 'success.dark', fontWeight: 600, mb: 1 }}>
                                                ✅ Mapping Summary ({Object.keys(columnMappings).filter(key => columnMappings[key]).length} columns mapped):
                                            </Typography>
                                            {Object.keys(columnMappings).filter(key => columnMappings[key]).map((sourceCol) => (
                                                <Typography key={sourceCol} variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                                                    <strong>{sourceCol}</strong> → <strong>{columnMappings[sourceCol]}</strong>
                                                </Typography>
                                            ))}
                                        </Box>
                                    )}
                                </Box>
                            )}
                        </Box>
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
                            Object.keys(columnMappings).filter(key => columnMappings[key]).length === 0
                        }
                    >
                        Save Destination Mapping
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
