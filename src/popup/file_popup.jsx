import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Grid,
    Box,
    Typography,
    CircularProgress,
    Snackbar,
    Alert,
    IconButton,
    MenuItem,
    FormControl,
    InputLabel,
    Select,
    List,
    ListItem,
    ListItemText,
    Checkbox,
    FormControlLabel,
    Divider,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

/**
 * BapiPopup
 * - open: boolean -> dialog open/closed
 * - setOpen: fn -> function to be used to close dialog
 * - type: "HANA" | "SAP" | "MSSQL" -> which form will be displayed
 * - data: object -> item data received when Details is clicked (e.g., { host, instance, client, user, ... })
 * - onSave: fn -> kaydetme sonrası parent'a dönen callback
 * - page: string -> "sources" or "destination" to determine API endpoint
 */
export default function BapiPopup({ open, setOpen, type = "SAP", onSave, data, page = "sources" }) {
    // --- common states ---
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [saving, setSaving] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, severity: "info", message: "" });

    const [sourceName, setSourceName] = useState("");

    // MSSQL alanları
    const [mssqlHost, setMssqlHost] = useState("");
    const [mssqlIp, setMssqlIp] = useState("");
    const [mssqlPort, setMssqlPort] = useState("");
    const [mssqlDatabase, setMssqlDatabase] = useState("");
    const [mssqlUsername, setMssqlUsername] = useState("");
    const [mssqlPassword, setMssqlPassword] = useState("");
    
    // SAP alanları
    const [sapHost, setSapHost] = useState("");
    const [sapInstance, setSapInstance] = useState("");
    const [sapSysnr, setSapSysnr] = useState("");
    const [sapLanguage, setSapLanguage] = useState("");
    const [sapUser, setSapUser] = useState("");
    const [sapPassword, setSapPassword] = useState("");

    // HANA alanları
    const [hanaHost, setHanaHost] = useState("");
    const [hanaUsername, setHanaUsername] = useState("");
    const [hanaPassword, setHanaPassword] = useState("");
    const [hanaSchema, setHanaSchema] = useState("");
    const [hanaPort, setHanaPort] = useState("");

    // Yeni state'ler: Schema, Table, Column seçimi için
    const [connectionSuccess, setConnectionSuccess] = useState(false);
    const [schemas, setSchemas] = useState([]);
    const [selectedSchema, setSelectedSchema] = useState("");
    const [tables, setTables] = useState([]);
    const [selectedTable, setSelectedTable] = useState("");
    const [columns, setColumns] = useState([]);
    const [selectedColumns, setSelectedColumns] = useState({});
    const [loadingSchemas, setLoadingSchemas] = useState(false);
    const [loadingTables, setLoadingTables] = useState(false);
    const [loadingColumns, setLoadingColumns] = useState(false);

    // Popup açıldığında gelen datayı forma doldur
    useEffect(() => {
        if (open && data) {
            setSourceName(data.name || "");

            if (type === "SAP") {
                setSapHost(data.details?.host || "");
                setSapInstance(data.details?.instance || "");
                setSapSysnr(data.details?.sysnr || data.details?.Sysnr || "");
                setSapLanguage(data.details?.language || "");
                setSapUser(data.details?.user || "");
                setSapPassword(""); // güvenlik için boş bırak
                // Diğerleri temizle
                setHanaHost(""); setHanaUsername(""); setHanaPassword(""); setHanaPort(""); setHanaSchema("");
                setMssqlHost(""); setMssqlIp(""); setMssqlPort(""); setMssqlDatabase(""); setMssqlUsername(""); setMssqlPassword("");
            } else if (type === "MSSQL") {
                setMssqlHost(data.details?.host || "");
                setMssqlIp(data.details?.ip || "");
                setMssqlPort(data.details?.port || "");
                setMssqlDatabase(data.details?.database || "");
                setMssqlUsername(data.details?.user || data.details?.username || "");
                setMssqlPassword(""); // güvenlik için boş bırak
                // Diğerleri temizle
                setSapHost(""); setSapInstance(""); setSapSysnr(""); setSapLanguage(""); setSapUser(""); setSapPassword("");
                setHanaHost(""); setHanaPort(""); setHanaUsername(""); setHanaPassword(""); setHanaSchema("");
            } else { // HANA
                setHanaHost(data.details?.host || "");
                setHanaPort(data.details?.port || "");
                setHanaUsername(data.details?.user || data.details?.username || "");
                setHanaPassword(""); // güvenlik için boş bırak
                setHanaSchema(data.details?.schema || "");
                // Diğerleri temizle
                setSapHost(""); setSapInstance(""); setSapSysnr(""); setSapLanguage(""); setSapUser(""); setSapPassword("");
                setMssqlHost(""); setMssqlIp(""); setMssqlPort(""); setMssqlDatabase(""); setMssqlUsername(""); setMssqlPassword("");
            }
        }

        if (!open) {
            // reset state when popup closes
            setTesting(false);
            setSaving(false);
            setTestResult(null);
        }
    }, [open, data, type]);

    // Validation functions
    const validateSAP = () =>
        sourceName.trim() &&
        sapHost.trim() &&
        sapInstance.trim() &&
        sapSysnr.trim() &&
        sapUser.trim();

    const validateMSSQL = () =>
        sourceName.trim() &&
        mssqlHost.trim() &&
        mssqlPort.trim() &&
        mssqlDatabase.trim() &&
        mssqlUsername.trim();

    const validateHANA = () =>
        sourceName.trim() &&
        hanaHost.trim() &&
        hanaPort.trim() &&
        hanaUsername.trim();

    // Test connection handler
    const handleTestConnection = async () => {
        // Validasyon
        if (type === "SAP" && !validateSAP()) {
            setSnackbar({ open: true, severity: "warning", message: "SAP alanlarını doldurun." });
            return;
        }
        if (type === "HANA" && !validateHANA()) {
            setSnackbar({ open: true, severity: "warning", message: "HANA alanlarını doldurun." });
            return;
        }
        if (type === "MSSQL" && !validateMSSQL()) {
            setSnackbar({ open: true, severity: "warning", message: "MSSQL alanlarını doldurun." });
            return;
        }

        setTesting(true);
        setTestResult(null);

        // details objesini form alanlarından oluştur (server'ın beklediği format)
        const details =
            type === "SAP"
                ? { user: sapUser, password: sapPassword, host: sapHost, sysnr: sapSysnr }
                : type === "HANA"
                    ? { host: hanaHost, port: hanaPort, user: hanaUsername, password: hanaPassword }
                    : { host: mssqlHost, database: mssqlDatabase, user: mssqlUsername, password: mssqlPassword };

        try {
            const token = localStorage.getItem("authToken");
            if (!token) {
                setSnackbar({ open: true, severity: "error", message: "Giriş token'ı bulunamadı." });
                setTesting(false);
                return;
            }

            const response = await fetch('/api/sources/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ details, type }),
            });

            const text = await response.text();
            let result = {};
            try {
                result = text ? JSON.parse(text) : {};
            } catch {
                console.warn('Test connection: parse error, raw text:', text);
                result = {};
            }

            if (response.ok) {
                setTestResult({ success: true, message: result.message || 'Bağlantı testi başarılı.' });
                setSnackbar({ open: true, severity: 'success', message: result.message || 'Bağlantı testi başarılı.' });
                setConnectionSuccess(true);
                
                // Başarılı bağlantıdan sonra schema listesini getir (sadece HANA ve MSSQL için)
                if (type === "HANA" || type === "MSSQL") {
                    fetchSchemas(details, type);
                }
            } else {
                setTestResult({ success: false, message: result.message || 'Bağlantı testi başarısız.' });
                setSnackbar({ open: true, severity: 'error', message: result.message || 'Bağlantı testi başarısız.' });
            }
        } catch (err) {
            console.error('Test connection error (frontend):', err);
            setSnackbar({ open: true, severity: 'error', message: 'Test sırasında bağlantı hatası.' });
        } finally {
            setTesting(false);
        }
    };

    // Schema listesini getir
    const fetchSchemas = async (details, type) => {
        setLoadingSchemas(true);
        try {
            const token = localStorage.getItem("authToken");
            const response = await fetch('/api/sources/schemas', {
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
                console.error('Schema fetch failed');
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
        if (!schema) return;
        
        setLoadingTables(true);
        const details = type === "SAP" 
            ? { user: sapUser, password: sapPassword, host: sapHost, sysnr: sapSysnr }
            : type === "HANA" 
                ? { host: hanaHost, port: hanaPort, user: hanaUsername, password: hanaPassword }
                : { host: mssqlHost, database: mssqlDatabase, user: mssqlUsername, password: mssqlPassword };
        
        try {
            const token = localStorage.getItem("authToken");
            const response = await fetch('/api/sources/tables', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ details, type, schema }),
            });

            if (response.ok) {
                const data = await response.json();
                setTables(data.tables || []);
            } else {
                console.error('Table fetch failed');
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
        if (!schema || !table) return;
        
        setLoadingColumns(true);
        const details = type === "SAP" 
            ? { user: sapUser, password: sapPassword, host: sapHost, sysnr: sapSysnr }
            : type === "HANA" 
                ? { host: hanaHost, port: hanaPort, user: hanaUsername, password: hanaPassword }
                : { host: mssqlHost, database: mssqlDatabase, user: mssqlUsername, password: mssqlPassword };
        
        try {
            const token = localStorage.getItem("authToken");
            const response = await fetch('/api/sources/columns', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ details, type, schema, table }),
            });

            if (response.ok) {
                const data = await response.json();
                setColumns(data.columns || []);
                setSelectedColumns({}); // Reset column selections
            } else {
                console.error('Column fetch failed');
                setSnackbar({ open: true, severity: 'error', message: 'Column listesi alınamadı.' });
            }
        } catch (err) {
            console.error('Column fetch error:', err);
            setSnackbar({ open: true, severity: 'error', message: 'Column listesi getirilemedi.' });
        } finally {
            setLoadingColumns(false);
        }
    };

    // Schema seçildiğinde table listesini getir
    const handleSchemaChange = (schemaName) => {
        setSelectedSchema(schemaName);
        setSelectedTable("");
        setTables([]);
        setColumns([]);
        setSelectedColumns({});
        if (schemaName) {
            fetchTables(schemaName);
        }
    };

    // Table seçildiğinde column listesini getir
    const handleTableChange = (tableName) => {
        setSelectedTable(tableName);
        setColumns([]);
        setSelectedColumns({});
        if (tableName && selectedSchema) {
            fetchColumns(selectedSchema, tableName);
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
    const handleSave = async () => {
        if (!sourceName.trim()) {
            setSnackbar({ open: true, severity: "warning", message: "Name alanı boş bırakılamaz." });
            return;
        }

        const details =
            type === "SAP"
                ? { host: sapHost, instance: sapInstance, sysnr: sapSysnr, language: sapLanguage, user: sapUser, password: sapPassword }
                : type === "HANA"
                    ? { host: hanaHost, port: hanaPort, user: hanaUsername, schema: hanaSchema, password: hanaPassword }
                    : { host: mssqlHost, ip: mssqlIp, port: mssqlPort, database: mssqlDatabase, user: mssqlUsername, password: mssqlPassword };
        
        const payload = { name: sourceName, type: type.toUpperCase(), details };

        setSaving(true);

        try {
            const token = localStorage.getItem("authToken");
            if (!token) {
                setSnackbar({ open: true, severity: "error", message: "Giriş token'ı bulunamadı." });
                setSaving(false);
                return;
            }

            const method = data?.id ? "PUT" : "POST";
            const baseUrl = page === "sources" ? "/api/sources" : "/api/destination";
            const url = data?.id ? `${baseUrl}/${data.id}` : baseUrl;

            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            const text = await response.text();
            let result = {};
            try {
                result = text ? JSON.parse(text) : {};
            } catch {
                console.warn('Save: JSON parse failed, raw response:', text);
                result = {};
            }

            if (response.ok) {
                setSnackbar({ open: true, severity: "success", message: data?.id ? "Source güncellendi." : "Source eklendi." });
                
                if (typeof onSave === "function") {
                    const selectedColumnsArray = Object.keys(selectedColumns).filter(key => selectedColumns[key]);
                    onSave({ 
                        ...details, 
                        type, 
                        name: sourceName, 
                        id: data?.id || result.sourceId,
                        selectedSchema,
                        selectedTable,
                        selectedColumns: selectedColumnsArray
                    });
                }
                setOpen(false);
                
                // Clear form
                clearForm();
            } else {
                setSnackbar({ open: true, severity: "error", message: result.message || "Kaydetme hatası." });
                console.error('Save failed, status:', response.status, 'body:', result);
            }
        } catch (err) {
            console.error("Save error (frontend):", err);
            setSnackbar({ open: true, severity: "error", message: "Bağlantı hatası." });
        } finally {
            setSaving(false);
        }
    };

    const clearForm = () => {
        setSourceName("");
        setSapHost(""); setSapInstance(""); setSapSysnr(""); setSapLanguage(""); setSapUser(""); setSapPassword("");
        setHanaHost(""); setHanaPort(""); setHanaUsername(""); setHanaPassword(""); setHanaSchema("");
        setMssqlHost(""); setMssqlIp(""); setMssqlPort(""); setMssqlDatabase(""); setMssqlUsername(""); setMssqlPassword("");
    };

    const handleCancel = () => {
        setOpen(false);
        clearForm();
    };
    
    const handleCloseSnackbar = () => setSnackbar(prev => ({ ...prev, open: false }));

    const boxBorderStyle = {
        border: "2px solid rgba(35, 92, 156, 0.9)",
        borderRadius: 2,
        p: 2,
        mb: 2,
        backgroundColor: "#fff",
    };

    const bigButtonSx = {
        minWidth: 150,
        height: 44,
        borderRadius: "10px",
        boxShadow: "none",
        textTransform: "none",
        fontSize: 15,
        fontWeight: 500,
    };

    const primaryBlue = "#2f67b3";

    return (
        <>
            <Dialog open={open} onClose={handleCancel} maxWidth="sm" fullWidth PaperProps={{ sx: { mx: 2, mt: 1, p: 3, borderRadius: 3, boxShadow: 3 } }}>
                {/* Başlık */}
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                    <Typography variant="h4" component="div" sx={{ fontWeight: 700 }}>
                        {page === "sources" ? "Source" : "Destination"} ({data?.id ? "Edit" : "New"} {type})
                    </Typography>
                    <IconButton onClick={handleCancel} size="small">
                        <CloseIcon />
                    </IconButton>
                </Box>

                {/* Name */}
                <Box sx={{ ...boxBorderStyle }}>
                    <Typography sx={{ mb: 1, fontWeight: 500 }}>Name:</Typography>
                    <TextField fullWidth size="small" value={sourceName} onChange={(e) => setSourceName(e.target.value)} />
                </Box>

                {/* SAP / HANA / MSSQL Formları */}
                {type === "SAP" ? (
                    <>
                        <Typography sx={{ mb: 1, fontWeight: 600 }}>System</Typography>
                        <Box sx={{ ...boxBorderStyle }}>
                            <Grid container spacing={2}>
                                <Grid item xs={12}>
                                    <Typography>Host:</Typography>
                                    <TextField fullWidth size="small" value={sapHost} onChange={(e) => setSapHost(e.target.value)} />
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography>Instance:</Typography>
                                    <TextField fullWidth size="small" value={sapInstance} onChange={(e) => setSapInstance(e.target.value)} />
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography>Sysnr:</Typography>
                                    <TextField fullWidth size="small" value={sapSysnr} onChange={(e) => setSapSysnr(e.target.value)} />
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography>Language:</Typography>
                                    <TextField
                                        select
                                        fullWidth
                                        size="small"
                                        value={sapLanguage}
                                        onChange={(e) => setSapLanguage(e.target.value)}
                                    >
                                        <MenuItem value="EN">English</MenuItem>
                                        <MenuItem value="TR">Turkish</MenuItem>
                                    </TextField>
                                </Grid>
                            </Grid>
                        </Box>
                        <Typography sx={{ mb: 1, fontWeight: 600 }}>Authentication</Typography>
                        <Box sx={{ ...boxBorderStyle }}>
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <Typography>User:</Typography>
                                    <TextField fullWidth size="small" value={sapUser} onChange={(e) => setSapUser(e.target.value)} />
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography>Password:</Typography>
                                    <TextField type="password" fullWidth size="small" value={sapPassword} onChange={(e) => setSapPassword(e.target.value)} />
                                </Grid>
                            </Grid>
                        </Box>
                    </>
                ) : type === "HANA" ? (
                    <>
                        <Typography sx={{ mb: 1, fontWeight: 600 }}>System</Typography>
                        <Box sx={{ ...boxBorderStyle }}>
                            <Grid container spacing={2}>
                                <Grid item xs={12}>
                                    <Typography>Host:</Typography>
                                    <TextField fullWidth size="small" value={hanaHost} onChange={(e) => setHanaHost(e.target.value)} />
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography>Port:</Typography>
                                    <TextField fullWidth size="small" value={hanaPort} onChange={(e) => setHanaPort(e.target.value)} />
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography>Schema (optional):</Typography>
                                    <TextField fullWidth size="small" value={hanaSchema} onChange={(e) => setHanaSchema(e.target.value)} />
                                </Grid>
                            </Grid>
                        </Box>
                        <Typography sx={{ mb: 1, fontWeight: 600 }}>Authentication</Typography>
                        <Box sx={{ ...boxBorderStyle }}>
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <Typography>Username:</Typography>
                                    <TextField fullWidth size="small" value={hanaUsername} onChange={(e) => setHanaUsername(e.target.value)} />
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography>Password:</Typography>
                                    <TextField type="password" fullWidth size="small" value={hanaPassword} onChange={(e) => setHanaPassword(e.target.value)} />
                                </Grid>
                            </Grid>
                        </Box>
                    </>
                ) : (
                    // MSSQL
                    <>
                        <Typography sx={{ mb: 1, fontWeight: 600 }}>System</Typography>
                        <Box sx={{ ...boxBorderStyle }}>
                            <Grid container spacing={2}>
                                <Grid item xs={12}>
                                    <Typography>Host:</Typography>
                                    <TextField fullWidth size="small" value={mssqlHost} onChange={(e) => setMssqlHost(e.target.value)} />
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography>IP:</Typography>
                                    <TextField fullWidth size="small" value={mssqlIp} onChange={(e) => setMssqlIp(e.target.value)} />
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography>Port:</Typography>
                                    <TextField fullWidth size="small" value={mssqlPort} onChange={(e) => setMssqlPort(e.target.value)} />
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography>Database:</Typography>
                                    <TextField fullWidth size="small" value={mssqlDatabase} onChange={(e) => setMssqlDatabase(e.target.value)} />
                                </Grid>
                            </Grid>
                        </Box>
                        <Typography sx={{ mb: 1, fontWeight: 600 }}>Authentication</Typography>
                        <Box sx={{ ...boxBorderStyle }}>
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <Typography>Username:</Typography>
                                    <TextField fullWidth size="small" value={mssqlUsername} onChange={(e) => setMssqlUsername(e.target.value)} />
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography>Password:</Typography>
                                    <TextField type="password" fullWidth size="small" value={mssqlPassword} onChange={(e) => setMssqlPassword(e.target.value)} />
                                </Grid>
                            </Grid>
                        </Box>
                    </>
                )}

                {/* Test Sonucu */}
                <Box sx={{ mt: 2 }}>
                    {testing ? (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <CircularProgress size={18} />
                            <Typography>Testing connection...</Typography>
                        </Box>
                    ) : testResult ? (
                        <Alert severity={testResult.success ? "success" : "error"}>{testResult.message}</Alert>
                    ) : (
                        <Typography variant="caption" sx={{ color: "text.secondary" }}>
                            Test yapılmadı
                        </Typography>
                    )}
                </Box>

                {/* Schema, Table, Column Seçimi - Sadece HANA ve MSSQL için */}
                {testResult?.success && (type === "HANA" || type === "MSSQL") && (
                    <Box sx={{ mt: 3 }}>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="h6" sx={{ mb: 2 }}>Database Explorer</Typography>
                        
                        {/* Schema Seçimi */}
                        <Box sx={{ ...boxBorderStyle }}>
                            <Typography sx={{ mb: 1, fontWeight: 500 }}>Schema:</Typography>
                            <FormControl fullWidth size="small">
                                <InputLabel>Select Schema</InputLabel>
                                <Select
                                    value={selectedSchema}
                                    label="Select Schema"
                                    onChange={(e) => handleSchemaChange(e.target.value)}
                                    disabled={loadingSchemas}
                                >
                                    {loadingSchemas ? (
                                        <MenuItem disabled>
                                            <CircularProgress size={16} /> Loading...
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

                        {/* Table Seçimi */}
                        {selectedSchema && (
                            <Box sx={{ ...boxBorderStyle }}>
                                <Typography sx={{ mb: 1, fontWeight: 500 }}>Table:</Typography>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Select Table</InputLabel>
                                    <Select
                                        value={selectedTable}
                                        label="Select Table"
                                        onChange={(e) => handleTableChange(e.target.value)}
                                        disabled={loadingTables}
                                    >
                                        {loadingTables ? (
                                            <MenuItem disabled>
                                                <CircularProgress size={16} /> Loading...
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

                        {/* Column Seçimi */}
                        {selectedTable && (
                            <Box sx={{ ...boxBorderStyle }}>
                                <Typography sx={{ mb: 1, fontWeight: 500 }}>Columns:</Typography>
                                {loadingColumns ? (
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                        <CircularProgress size={16} />
                                        <Typography variant="body2">Loading columns...</Typography>
                                    </Box>
                                ) : (
                                    <List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
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
                                                        <ListItemText
                                                            primary={column.name}
                                                            secondary={`${column.type}${column.length ? `(${column.length})` : ''} ${column.nullable ? 'NULL' : 'NOT NULL'}`}
                                                        />
                                                    }
                                                />
                                            </ListItem>
                                        ))}
                                        {columns.length === 0 && (
                                            <Typography variant="body2" sx={{ color: "text.secondary", textAlign: 'center', py: 2 }}>
                                                No columns found
                                            </Typography>
                                        )}
                                    </List>
                                )}
                                
                                {/* Seçilen Column Sayısı */}
                                {Object.keys(selectedColumns).filter(key => selectedColumns[key]).length > 0 && (
                                    <Typography variant="caption" sx={{ mt: 1, display: 'block', color: 'primary.main' }}>
                                        {Object.keys(selectedColumns).filter(key => selectedColumns[key]).length} column(s) selected
                                    </Typography>
                                )}
                            </Box>
                        )}
                    </Box>
                )}

                {/* Butonlar */}
                <Box sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}>
                    <Button variant="contained" onClick={handleTestConnection} disabled={testing || saving} sx={{ ...bigButtonSx, backgroundColor: primaryBlue }}>
                        {testing ? <CircularProgress size={20} color="inherit" /> : "Test Connection"}
                    </Button>
                    <Box sx={{ display: "flex", gap: 2 }}>
                        <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ ...bigButtonSx, backgroundColor: primaryBlue }}>
                            {saving ? <CircularProgress size={18} color="inherit" /> : "Save"}
                        </Button>
                        <Button variant="contained" onClick={handleCancel} disabled={saving || testing} sx={{ ...bigButtonSx, backgroundColor: primaryBlue }}>
                            Cancel
                        </Button>
                    </Box>
                </Box>
            </Dialog>

            <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={handleCloseSnackbar}>
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </>
    );
}
