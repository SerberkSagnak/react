import React, { useState, useEffect } from "react";
import {
    Dialog,
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
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";



export default function BapiPopup({ open, setOpen, type = "SAP", onSave, data, page }) {
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

    // Popup açıldığında gelen datayı forma doldur
    useEffect(() => {
        if (open && data) {
            setSourceName(data.name || "");

            if (type === "SAP") {
                setSapHost(data.details?.host || "");
                setSapInstance(data.details?.instance || "");
                setSapSysnr(data.details?.Sysnr || "");
                setSapLanguage(data.details?.language || "");
                setSapUser(data.details?.user || "");
                setSapPassword(data.details?.password || "");
                // HANA temizle
                setHanaHost("");
                setHanaUsername("");
                setHanaPassword("");
                setHanaPort("");
            }
            else if (type === "MSSQL") {
                setMssqlHost(data.details?.host || "");
                setMssqlIp(data.details?.ip || "");
                setMssqlPort(data.details?.port || "");
                setMssqlDatabase(data.details?.database || "");
                setMssqlUsername(data.details?.username || "");
                setMssqlPassword(data.details?.password || "");
                // SAP & HANA temizle
                setSapHost(""); setSapInstance(""); setSapSysnr(""); setSapLanguage(""); setSapUser(""); setSapPassword("");
                setHanaHost(""); setHanaPort(""); setHanaUsername(""); setHanaPassword(""); setHanaSchema("");
            } else {
                setHanaHost(data.details?.host || "");
                setHanaPort(data.details?.port || "");
                setHanaUsername(data.details?.username || "");
                setHanaPassword(data.details?.password || "");
                setHanaSchema(data.details?.schema || "");
                // SAP temizle
                setSapHost("");
                setSapInstance("");
                setSapSysnr("");
                setSapLanguage("");
                setSapUser("");
                setSapPassword("");
            }
        }

        if (!open) {
            setTesting(false);
            setSaving(false);
            setTestResult(null);
        }
    }, [open, data, type]);

    const validateSAP = () =>
        sourceName.trim() &&
        sapHost.trim() &&
        sapInstance.trim() &&
        sapSysnr.trim() &&
        sapUser.trim();

    const validateMSSQL = () =>
        sourceName.trim() &&
        mssqlHost.trim() &&
        mssqlIp.trim() &&
        mssqlPort.trim() &&
        mssqlDatabase.trim() &&
        mssqlUsername.trim();

    const validateHANA = () =>
        sourceName.trim() &&
        hanaHost.trim() &&
        hanaPort.trim() &&
        hanaUsername.trim();



    // --- handleTestConnection (düzeltildi) ---
    // açıklama: doğru endpoint'e POST atar, testing state'i set edilir, response güvenli parse edilir
    const handleTestConnection = async () => {
        // Validasyon (isteğe bağlı, en azından form alanlarını kontrol et)
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

        setTesting(true); // test sırasında buton disable olsun

        // details objesini form alanlarından oluştur (HANA veya SAP'e göre)
        const details =
            type === "SAP"
                ? { user: sapUser, password: sapPassword, host: sapHost, sysnr: sapSysnr }
                : type === "HANA"
                    ? { host: hanaHost, port: hanaPort, username: hanaUsername, password: hanaPassword }
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

            const text = await response.text(); // önce text al
            let result = {};
            try {
                result = text ? JSON.parse(text) : {};
            } catch (e) {
                console.warn('Test connection: parse error, raw text:', text);
                result = {};
            }

            if (response.ok) {
                setTestResult({ success: true, message: result.message || 'Bağlantı testi başarılı.' });
                setSnackbar({ open: true, severity: 'success', message: result.message || 'Bağlantı testi başarılı.' });
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









    // 🔑 Kaydetme (Yeni ekle veya güncelle)
    // --- handleSave (güvenli JSON parse ve hata loglama ile) ---
    const handleSave = async () => {
        if (!sourceName.trim()) {
            setSnackbar({ open: true, severity: "warning", message: "Name alanı boş bırakılamaz." });
            return;
        }

        const details =
            type === "SAP"
                ? { host: sapHost, instance: sapInstance, Sysnr: sapSysnr, language: sapLanguage, user: sapUser, password: sapPassword }
                : type === "HANA"
                    ? { host: hanaHost, port: hanaPort, username: hanaUsername, schema: hanaSchema, password: hanaPassword }
                    : { host: mssqlHost, ip: mssqlIp, port: mssqlPort, database: mssqlDatabase, username: mssqlUsername, password: mssqlPassword };
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
            } catch (e) {
                console.warn('Save: JSON parse failed, raw response:', text);
                result = {};
            }

            if (response.ok) {
                setSnackbar({ open: true, severity: "success", message: data?.id ? "Source güncellendi." : "Source eklendi." });
                if (typeof onSave === "function") {
                    onSave({ ...details, type, name: sourceName, id: data?.id || result.sourceId });
                }
                setOpen(false);
            } else {
                setSnackbar({ open: true, severity: "error", message: result.message || "Kaydetme hatası." });
                console.error('Save failed, status:', response.status, 'body:', result);
            }
            setSourceName("");
            switch (type) {
                case "HANA":
                    setHanaHost(""); setHanaPort(""); setHanaUsername(""); setHanaPassword(""); setHanaSchema("");
                    break;

                case "MSSQL":
                    setMssqlHost(""); setMssqlDatabase(""); setMssqlIp(""); setMssqlPassword(""); setMssqlPort(""); setMssqlUsername("");
                    break;

                case "SAP":
                    setSapHost("");
                    setSapInstance("");
                    setSapSysnr("");
                    setSapLanguage("");
                    setSapUser("");
                    setSapPassword("");

                    break;

                default:
                    throw new Error(`Desteklenmeyen veritabanı tipi: ${type}`);
            }

        } catch (err) {
            console.error("Save error (frontend):", err);
            setSnackbar({ open: true, severity: "error", message: "Bağlantı hatası." });
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => setOpen(false);
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
                        Source ({data?.id ? "Edit" : "New"} {type})
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

                {/* SAP veya HANA form */}

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
                                        select                 // TextField’i combobox gibi yapar
                                        fullWidth
                                        size="small"
                                        value={sapLanguage}    // seçili değer state’den gelir
                                        onChange={(e) => setSapLanguage(e.target.value)} // seçilen değeri state’e yaz
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
                    {/* {testing ? (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 100 }}>
                            <CircularProgress size={18} />
                            <Typography>Testing connection...</Typography>
                        </Box>
                    ) : testResult ? (
                        <Alert severity={testResult.success ? "success" : "error"}>{testResult.message}</Alert>
                    ) : (
                        <Typography variant="caption" sx={{ color: "text.secondary" }}>
                            Test yapılmadı
                        </Typography>
                    )} */}
                </Box>

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