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
    IconButton
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

/**
 * BapiPopup
 * - open: boolean -> dialog open/closed
 * - setOpen: fn -> function to be used to close dialog
 * - type: "Hana" | "SAP" -> which form will be displayed
 * - data: object -> item data received when Details is clicked (e.g., { host, instance, client, user, ... })
 * - onSave: fn -> kaydetme sonrası parent’a dönen callback
 */
export default function BapiPopup({ open, setOpen, type = "SAP", onSave, data }) {
    // --- common states ---
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [saving, setSaving] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, severity: "info", message: "" });

    // --- SAP form alanları ---
    const [sapHost, setSapHost] = useState("");
    const [sapInstance, setSapInstance] = useState("");
    const [sapClient, setSapClient] = useState("");
    const [sapLanguage, setSapLanguage] = useState("");
    const [sapUser, setSapUser] = useState("");
    const [sapPassword, setSapPassword] = useState("");

    // --- HANA form alanları ---
    const [hanaServer, setHanaServer] = useState("");
    const [hanaUsername, setHanaUsername] = useState("");
    const [hanaPassword, setHanaPassword] = useState("");
    const [hanaDatabase, setHanaDatabase] = useState("");
    const [hanaSchema, setHanaSchema] = useState("");

    // Popup açıldığında data varsa alanlara doldur
    useEffect(() => {
        if (open && data) {
            if (type === "SAP") {
                setSapHost(data.host || "");
                setSapInstance(data.instance || "");
                setSapClient(data.client || "");
                setSapLanguage(data.language || "");
                setSapUser(data.user || "");
                setSapPassword(""); // leave empty for security
            } else {
                setHanaServer(data.server || "");
                setHanaUsername(data.username || "");
                setHanaPassword(""); // leave empty for security
                setHanaDatabase(data.database || "");
                setHanaSchema(data.schema || "");
            }
        }

        if (!open) {
            // reset state when popup closes
            setTesting(false);
            setSaving(false);
            setTestResult(null);
        }
    }, [open, data, type]);

    // --- Simple client-side validation ---
    const validateSAP = () => sapHost.trim() && sapInstance.trim() && sapClient.trim() && sapUser.trim() && sapPassword.trim();
    const validateHANA = () => hanaServer.trim() && hanaUsername.trim() && hanaPassword.trim() && hanaDatabase.trim();

    // --- Test connection (simulated) ---
    const handleTestConnection = async () => {
        setTestResult(null);

        if (type === "SAP") {
            if (!validateSAP()) {
                setSnackbar({ open: true, severity: "warning", message: "Please fill in all required fields for SAP." });
                return;
            }
        } else {
            if (!validateHANA()) {
                setSnackbar({ open: true, severity: "warning", message: "Please fill in all required fields for HANA." });
                return;
            }
        }

        setTesting(true);
        setTestResult(null);

        setTimeout(() => {
            const failCondition =
                (type === "SAP" && sapUser.toLowerCase().includes("fail")) ||
                (type === "Hana" && hanaUsername.toLowerCase().includes("fail"));

            if (failCondition) {
                setTestResult({ success: false, message: "Connection test failed (simulation)." });
                setSnackbar({ open: true, severity: "error", message: "Test connection failed." });
            } else {
                setTestResult({ success: true, message: "Connection test successful." });
                setSnackbar({ open: true, severity: "success", message: "Test connection successful." });
            }
            setTesting(false);
        }, 1200);
    };

    // --- Save operation (save to API) ---
    const handleSave = async () => {
        if (type === "SAP" && !validateSAP()) {
            setSnackbar({ open: true, severity: "warning", message: "SAP fields are missing. Please fill them to save." });
            return;
        }
        if (type === "Hana" && !validateHANA()) {
            setSnackbar({ open: true, severity: "warning", message: "HANA fields are missing. Please fill them to save." });
            return;
        }

        setSaving(true);

        try {
            const details = type === "SAP" 
                ? { host: sapHost, instance: sapInstance, client: sapClient, language: sapLanguage, user: sapUser }
                : { server: hanaServer, username: hanaUsername, database: hanaDatabase, schema: hanaSchema };

            const sourceName = prompt("Enter a name for the source:") || `${type}_${Date.now()}`;

            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/sources', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: sourceName,
                    type: type.toUpperCase(),
                    details: details
                })
            });

            const result = await response.json();

            if (response.ok) {
                setSnackbar({ open: true, severity: "success", message: "Source saved successfully!" });
                
                if (typeof onSave === "function") {
                    onSave({ ...details, type: type, name: sourceName, id: result.sourceId });
                }
                
                setOpen(false);
            } else {
                setSnackbar({ open: true, severity: "error", message: result.message || "Save error." });
            }
        } catch (err) {
            console.error('Save error:', err);
            setSnackbar({ open: true, severity: "error", message: "Connection error occurred." });
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => setOpen(false);
    const handleCloseSnackbar = () => setSnackbar(prev => ({ ...prev, open: false }));

    // --- Render SAP form ---
    const renderSAPForm = () => (
        <Box component="form" noValidate autoComplete="off" sx={{ mt: 1 }}>
            <Grid container spacing={2}>
                <Grid item xs={12} sm={8}>
                    <TextField fullWidth label="Host" value={sapHost} onChange={(e) => setSapHost(e.target.value)} required />
                </Grid>
                <Grid item xs={6} sm={4}>
                    <TextField fullWidth label="Instance No" value={sapInstance} onChange={(e) => setSapInstance(e.target.value)} required />
                </Grid>
                <Grid item xs={6} sm={4}>
                    <TextField fullWidth label="Client" value={sapClient} onChange={(e) => setSapClient(e.target.value)} required />
                </Grid>
                <Grid item xs={6} sm={4}>
                    <TextField fullWidth label="Language" value={sapLanguage} onChange={(e) => setSapLanguage(e.target.value)} />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="User" value={sapUser} onChange={(e) => setSapUser(e.target.value)} required />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <TextField fullWidth type="password" label="Password" value={sapPassword} onChange={(e) => setSapPassword(e.target.value)} required />
                </Grid>
            </Grid>
        </Box>
    );

    // --- Render HANA form ---
    const renderHanaForm = () => (
        <Box component="form" noValidate autoComplete="off" sx={{ mt: 1 }}>
            <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Server" value={hanaServer} onChange={(e) => setHanaServer(e.target.value)} required />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Database" value={hanaDatabase} onChange={(e) => setHanaDatabase(e.target.value)} required />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Username" value={hanaUsername} onChange={(e) => setHanaUsername(e.target.value)} required />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <TextField fullWidth type="password" label="Password" value={hanaPassword} onChange={(e) => setHanaPassword(e.target.value)} required />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Schema (optional)" value={hanaSchema} onChange={(e) => setHanaSchema(e.target.value)} />
                </Grid>
            </Grid>
        </Box>
    );

    return (
        <>
            <Dialog open={open} onClose={handleCancel} maxWidth="md" fullWidth>
                <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Typography variant="h6">{type === "SAP" ? "SAP Connection Settings" : "HANA Connection Settings"}</Typography>
                    <IconButton onClick={handleCancel} size="small" aria-label="close">
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>

                <DialogContent dividers>
                    <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
                        {type === "SAP"
                            ? "Enter the required information to connect to the SAP system."
                            : "Enter the required information to connect to the HANA database."}
                    </Typography>

                    {type === "SAP" ? renderSAPForm() : renderHanaForm()}

                    <Box sx={{ mt: 2 }}>
                        {testing ? (
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <CircularProgress size={20} />
                                <Typography variant="body2">Testing connection...</Typography>
                            </Box>
                        ) : testResult ? (
                            <Alert severity={testResult.success ? "success" : "error"} sx={{ mt: 1 }}>
                                {testResult.message}
                            </Alert>
                        ) : (
                            <Typography variant="caption" sx={{ color: "text.secondary" }}>
                                Connection test not performed.
                            </Typography>
                        )}
                    </Box>
                </DialogContent>

                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Box sx={{ flex: 1 }}>
                        <Button
                            variant="outlined"
                            onClick={handleTestConnection}
                            disabled={testing || saving}
                            startIcon={testing ? <CircularProgress size={16} /> : null}
                        >
                            Test Connection
                        </Button>
                    </Box>
                    <Box>
                        <Button onClick={handleCancel} disabled={testing || saving} sx={{ mr: 1 }}>
                            Cancel
                        </Button>
                        <Button variant="contained" onClick={handleSave} disabled={saving}>
                            {saving ? <CircularProgress size={18} color="inherit" /> : "Save"}
                        </Button>
                    </Box>
                </DialogActions>
            </Dialog>

            <Snackbar open={snackbar.open} autoHideDuration={3500} onClose={handleCloseSnackbar}>
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: "100%" }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </>
    );
}