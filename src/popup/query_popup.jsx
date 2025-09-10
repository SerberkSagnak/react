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
 * - open: boolean -> dialog açık/kapalı
 * - setOpen: fn -> dialog'ı kapatmak için kullanılacak fonksiyon
 * - type: "Hana" | "SAP" -> hangi formun gösterileceği
 * - data: obje -> Details tıklanınca gelen item verisi (ör: { host, instance, client, user, ... })
 * - onSave: fn -> kaydetme sonrası parent’a dönen callback
 */
export default function query_popup({ open, setOpen, type = "SAP", onSave, data }) {
    // --- ortak durumlar ---
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
    const [hanaHost, setHanaHost] = useState("");
    const [hanaUsername, setHanaUsername] = useState("");
    const [hanaPassword, setHanaPassword] = useState("");
    const [hanaPort, setHanaPort] = useState("");
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
                setSapPassword(""); // güvenlik için boş bırak
            } else {
                setHanaHost(data.server || "");
                setHanaUsername(data.username || "");
                setHanaPassword(""); // güvenlik için boş bırak
                setHanaPort(data.database || "");
                setHanaSchema(data.schema || "");
            }
        }

        if (!open) {
            // popup kapandığında state sıfırla
            setTesting(false);
            setSaving(false);
            setTestResult(null);
        }
    }, [open, data, type]);

    // --- Basit istemci tarafı doğrulama ---
    const validateSAP = () => sapHost.trim() && sapInstance.trim() && sapClient.trim() && sapUser.trim() && sapPassword.trim();
    const validateHANA = () => hanaHost.trim() && hanaUsername.trim() && hanaPassword.trim() && hanaPort.trim();

    // --- Test connection (simule edilmiş) ---
    const handleTestConnection = async () => {
        setTestResult(null);

        if (type === "SAP") {
            if (!validateSAP()) {
                setSnackbar({ open: true, severity: "warning", message: "Lütfen SAP için tüm zorunlu alanları doldurun." });
                return;
            }
        } else {
            if (!validateHANA()) {
                setSnackbar({ open: true, severity: "warning", message: "Lütfen HANA için tüm zorunlu alanları doldurun." });
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
                setTestResult({ success: false, message: "Bağlantı testi başarısız (simülasyon)." });
                setSnackbar({ open: true, severity: "error", message: "Test bağlantısı başarısız." });
            } else {
                setTestResult({ success: true, message: "Bağlantı testi başarılı." });
                setSnackbar({ open: true, severity: "success", message: "Test bağlantısı başarılı." });
            }
            setTesting(false);
        }, 1200);
    };

    // --- Save işlemi (API'ye kaydet) ---
    const handleSave = async () => {
        if (type === "SAP" && !validateSAP()) {
            setSnackbar({ open: true, severity: "warning", message: "SAP alanları eksik. Kaydedinmek için doldurun." });
            return;
        }
        if (type === "Hana" && !validateHANA()) {
            setSnackbar({ open: true, severity: "warning", message: "HANA alanları eksik. Kaydedinmek için doldurun." });
            return;
        }

        setSaving(true);

        try {
            const details = type === "SAP"
                ? { host: sapHost, instance: sapInstance, client: sapClient, language: sapLanguage, user: sapUser }
                : { server: hanaHost, username: hanaUsername, database: hanaPort, schema: hanaSchema };

            const sourceName = prompt("Source için bir isim girin:") || `${type}_${Date.now()}`;

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
                setSnackbar({ open: true, severity: "success", message: "Source başarıyla kaydedildi!" });

                if (typeof onSave === "function") {
                    onSave({ ...details, type: type, name: sourceName, id: result.sourceId });
                }

                setOpen(false);
            } else {
                setSnackbar({ open: true, severity: "error", message: result.message || "Kaydetme hatası." });
            }
        } catch (err) {
            console.error('Save error:', err);
            setSnackbar({ open: true, severity: "error", message: "Bağlantı hatası oluştu." });
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
                    <TextField fullWidth label="Server" value={hanaHost} onChange={(e) => setHanaHost(e.target.value)} required />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Database" value={hanaPort} onChange={(e) => setPort(e.target.value)} required />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Username" value={hanaUsername} onChange={(e) => setHanaUsername(e.target.value)} required />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <TextField fullWidth type="password" label="Password" value={hanaPassword} onChange={(e) => setHanaPassword(e.target.value)} required />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Schema (opsiyonel)" value={hanaSchema} onChange={(e) => setHanaSchema(e.target.value)} />
                </Grid>
            </Grid>
        </Box>
    );

    return (
        <>
            <Dialog open={open} onClose={handleCancel} maxWidth="md" fullWidth>
                <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Typography variant="h6">{type === "SAP" ? "SAP Bağlantı Ayarları" : "HANA Bağlantı Ayarları"}</Typography>
                    <IconButton onClick={handleCancel} size="small" aria-label="close">
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>

                <DialogContent dividers>
                    <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
                        {type === "SAP"
                            ? "SAP sistemine bağlanmak için gerekli bilgileri giriniz."
                            : "HANA veritabanına bağlanmak için gerekli bilgileri giriniz."}
                    </Typography>

                    {type === "SAP" ? renderSAPForm() : renderHanaForm()}

                    <Box sx={{ mt: 2 }}>
                        {testing ? (
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <CircularProgress size={20} />
                                <Typography variant="body2">Bağlantı testi yapılıyor...</Typography>
                            </Box>
                        ) : testResult ? (
                            <Alert severity={testResult.success ? "success" : "error"} sx={{ mt: 1 }}>
                                {testResult.message}
                            </Alert>
                        ) : (
                            <Typography variant="caption" sx={{ color: "text.secondary" }}>
                                Bağlantı testi yapılmadı.
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