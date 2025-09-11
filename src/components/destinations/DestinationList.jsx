import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Stack,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import sapLogo from '../../photo/SAP_2011_logo.svg.png';
import hanaLogo from '../../photo/saphana.png';
import mssqlLogo from '../../photo/mssqllogo.png';
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import StorageIcon from "@mui/icons-material/Storage";
import BusinessCenterIcon from "@mui/icons-material/BusinessCenter";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import BapiPopup from "../../popup/file_popup.jsx"; // popup component

/**
 * Destination bileşeni
 * - /api/Destination'dan liste çeker
 * - Her satır için detay / edit / delete butonları gösterir
 * - Delete butonu onay alıp backend'e DELETE isteği gönderir
 *
 * Not: Token için localStorage.getItem('authToken') kullanılıyor.
 * Eğer proje AuthContext kullanıyorsa getAuthToken() fonksiyonunu ona göre güncelle.
 */

const DestinationList = () => {
  // Kaynak listesi state'i
  const [destination, setDestination] = useState([]);
  const [loading, setLoading] = useState(true);

  // Popup ile ilgili state'ler
  const [openPopup, setOpenPopup] = useState(false);
  const [popupType, setPopupType] = useState("");
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [fromDetails, setFromDetails] = useState(false);
  // Silme onayı / işlem state'leri
  const [confirmOpen, setConfirmOpen] = useState(false); // onay dialogu açık mı
  const [deletingId, setDeletingId] = useState(null); // şu anda silinmek üzere seçili id
  const [deletingLoading, setDeletingLoading] = useState(false); // silme isteği sırasında spinner göstermek için

  // Snackbar (kısa bildirim) state'i
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });

  // Token alma helper'ı (gerekirse AuthContext ile değiştir)
  const getAuthToken = () => {
    return localStorage.getItem('authToken');
  };

  // API'den Destination listesini getir
  const fetchDestination = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const response = await fetch('/api/destination', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      if (response.ok) {
        const data = await response.json();
        // Backend'den dönen formatı frontend objesine çevir
        setDestination(data.map(s => ({
          id: s.ID ?? s.id,                     // hem ID hem id'i destekle
          type: (s.TYPE ?? s.type ?? "").toLowerCase(), // tip küçük harfe çevir
          name: s.NAME ?? s.name ?? "İsimsiz",
          description: `${s.TYPE ?? s.type ?? ""} connection`
        })));
      } else {
        // 401/403 gibi durumlarda kullanıcı bilgilendirilebilir
        console.error('Destination getirme hata kodu:', response.status);
        setSnackbar({ open: true, message: 'Kaynaklar alınamadı.', severity: 'error' });
      }
    } catch (err) {
      console.error('Destination getirilemedi:', err);
      setSnackbar({ open: true, message: 'Sunucu ile bağlantı kurulamadı.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Component ilk render olduğunda listeyi çek
  useEffect(() => {
    fetchDestination();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sil butonuna basıldığında: sadece onay dialogunu aç (gerçek silme onayda yapılır)
  const handleDelete = (id) => {
    setDeletingId(id);     // hangi id silinecek?
    setConfirmOpen(true);  // onay dialogunu aç
  };

  // Onay dialogunda "Evet, sil" denildiğinde çalışır
  const confirmDelete = async () => {
    if (!deletingId) {
      setConfirmOpen(false);
      return;
    }

    setDeletingLoading(true); // silme isteği başladı -> butonda spinner göster
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/destination/${encodeURIComponent(deletingId)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
      });

      if (res.status === 200 || res.status === 204) {
        // Başarılı -> UI'dan kaldır
        setDestination(prev => prev.filter(s => String(s.id) !== String(deletingId)));

        // Eğer popup'ta şu an silinen kaynak açıksa popup'ı kapat
        if (selectedDestination && String(selectedDestination.id) === String(deletingId)) {
          setOpenPopup(false);
          setSelectedDestination(null);
        }

        setSnackbar({ open: true, message: 'Source başarıyla silindi.', severity: 'success' });
      } else {
        // Hataysa olası mesajı almaya çalış
        let msg = `Silme hatası: ${res.status}`;
        try {
          const j = await res.json();
          if (j && j.message) msg = j.message;
        } catch (e) {
          // JSON parse edilemedi ise default mesaj kalır
        }
        console.error('Silme hatası detay:', msg);
        setSnackbar({ open: true, message: msg, severity: 'error' });
      }
    } catch (err) {
      console.error('Silme isteği hatası:', err);
      setSnackbar({ open: true, message: 'Silme isteği sırasında hata oluştu.', severity: 'error' });
    } finally {
      // Temizlik
      setDeletingLoading(false);
      setConfirmOpen(false);
      setDeletingId(null);
    }
  };

  // Silme iptali
  const cancelDelete = () => {
    setConfirmOpen(false);
    setDeletingId(null);
  };

  // Detay veya edit butonuna tıklayınca popup açma
  const handleDetails = async (destination) => {
    setFromDetails(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/destination/${encodeURIComponent(destination.id)}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      if (res.ok) {
        const data = await res.json();
        // data: { id, name, type, details: {host, port, ...} }
        setSelectedDestination(data);
        setPopupType(
          data.type === "HANA" ? "HANA" :
            data.type === "MSSQL" ? "MSSQL" :
              "SAP"
        );
        setOpenPopup(true);
      } else {
        console.error("Detaylar alınamadı", res.status);
        setSnackbar({ open: true, message: "Detaylar alınamadı.", severity: "error" });
      }
    } catch (err) {
      console.error("Detay isteği hatası:", err);
      setSnackbar({ open: true, message: "Sunucuya bağlanılamadı.", severity: "error" });
    }
  };


  // İkon seçimi
  const getIcon = (type) => {
    const t = (type || "").toLowerCase();

    const commonStyle = {
      width: 50,
      height: 50,
      objectFit: "contain", // logonun bozulmadan sığmasını sağlar
      borderRadius: 4,      // hafif yuvarlak köşe
    };

    if (t === "hana" || t === "hdb" || t.includes("hana")) {
      return <img src={hanaLogo} alt="HANA" style={commonStyle} />;
    }
    if (t === "mssql" || t === "mssql" || t.includes("mssql")) {
      return <img src={mssqlLogo} alt="MSSQL" style={commonStyle} />;
    }

    // default: SAP veya diğerleri
    return <img src={sapLogo} alt="SAP" style={commonStyle} />;
  };
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Set up a new destination
      </Typography>

      {/* Kart butonlar */}
      <DataSourceCards openPopup={openPopup} setOpenPopup={setOpenPopup} setPopupType={setPopupType} />

      <hr className="my-4 border-t border-gray-300" />

      {/* Liste */}
      <Stack
        spacing={1}
        sx={{
          p: 1,
          bgcolor: "#f5f7ff",
          borderRadius: 2,
          border: "1px solid #d0d7ff",
          maxHeight: 400,
          overflowY: "auto",
        }}
      >
        {/* Yükleniyorsa spinner göster */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {destination.map((s) => (
              <Box
                key={s.id}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  p: 1.5,
                  borderRadius: 1,
                  bgcolor: "#ffffff",
                  "&:hover": { bgcolor: "#eef3ff" },
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  {getIcon(s.type)}
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {s.name}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      {s.description}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: "flex", gap: 1 }}>
                  {/* Edit butonu */}
                  <Tooltip title="Edit">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handleDetails(s)}
                      sx={{
                        border: "1px solid #d0d7ff",
                        bgcolor: "#f5f7ff",
                        "&:hover": { bgcolor: "#eef3ff" },
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>

                  {/* Details butonu */}
                  <Tooltip title="Details">
                    <IconButton
                      size="small"
                      color="info"
                      onClick={() => handleDetails(s)}
                      sx={{
                        border: "1px solid #d0d7ff",
                        bgcolor: "#f5f7ff",
                        "&:hover": { bgcolor: "#eef3ff" },
                      }}
                    >
                      <InfoOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>

                  {/* Delete butonu: eğer şu an bu id siliniyorsa spinner göster */}
                  <Tooltip title="Delete">
                    <span> {/* span ile wrapper: disabled IconButton için tooltip çalışır */}
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(s.id)}
                        disabled={deletingLoading && String(deletingId) === String(s.id)}
                        sx={{
                          border: "1px solid #d0d7ff",
                          bgcolor: "#f5f7ff",
                          "&:hover": { bgcolor: "#eef3ff" },
                        }}
                      >
                        {deletingLoading && String(deletingId) === String(s.id) ? (
                          <CircularProgress size={18} />
                        ) : (
                          <DeleteIcon fontSize="small" />
                        )}
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
              </Box>
            ))}

            {destination.length === 0 && (
              <Typography sx={{ textAlign: "center", color: "text.secondary", mt: 2 }}>
                Henüz destination yok.
              </Typography>
            )}
          </>
        )}
      </Stack>

      {/* Silme onay dialogu */}
      <Dialog open={confirmOpen} onClose={cancelDelete}>
        <DialogTitle>Kaynağı sil</DialogTitle>
        <DialogContent>
          <Typography>
            Seçilen kaynağı silmek istediğinize emin misiniz? (ID: {deletingId})
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDelete}>İptal</Button>
          <Button onClick={confirmDelete} variant="contained" disabled={deletingLoading}>
            {deletingLoading ? <CircularProgress size={18} /> : "Evet, sil"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Popup */}
      <BapiPopup
        open={openPopup}
        setOpen={(val) => {
          setOpenPopup(val);
          if (!val) {
            setFromDetails(false);   // 🔹 Popup kapanınca reset
            setSelectedDestination(null); // 🔹 Eski datayı da temizle
          }
        }}
        type={popupType}
        page="destination"
        data={selectedDestination}
        fromDetails={fromDetails}
        onSave={() => fetchDestination()}
      />
      {/* Snackbar bildirimleri */}
      <Snackbar
        open={snackbar.open}
        message={snackbar.message}
        autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
      />
    </Box>
  );
};

function DataSourceCards({ setOpenPopup, setPopupType }) {
  const handleOpen = (type) => {
    setPopupType(type);
    setOpenPopup(true);
  };

  return (
    <Stack direction="row" spacing={2} sx={{ mb: 2 }}>

      {/* Hana DB kartı */}
      <Button
        onClick={() => handleOpen("HANA")}
        variant="outlined"
        sx={{
          width: 180,
          justifyContent: "flex-start",
          alignItems: "center",
          textTransform: "none",
          bgcolor: "#fff",
          borderRadius: 2,
          boxShadow: "0 4px 10px rgba(15,23,42,0.04)",
          p: 1.5,
          border: "1px solid rgba(15,23,42,0.06)",
          minHeight: 60,
          "&:hover": { bgcolor: "#f6f9ff", boxShadow: "0 6px 16px rgba(15,23,42,0.06)" },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", mr: 1.5 }}>
          <Avatar
            variant="square" // yuvarlak yerine kare
            sx={{
              bgcolor: "#fff",
              width: 50,
              height: 50
            }}
          >
            <img
              src={hanaLogo}
              alt="HANA"
              style={{ width: 50, height: 50, objectFit: "contain" }}
            />
          </Avatar>
        </Box>
        <Box sx={{ textAlign: "left" }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Hana DB</Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Add SAP HANA connection
          </Typography>
        </Box>
      </Button>


      {/* SAP kartı */}
      <Button
        onClick={() => handleOpen("SAP")}
        variant="outlined"
        sx={{
          width: 180,
          justifyContent: "flex-start",
          alignItems: "center",
          textTransform: "none",
          bgcolor: "#fff",
          borderRadius: 2,
          boxShadow: "0 4px 10px rgba(15,23,42,0.04)",
          p: 1.5,
          border: "1px solid rgba(15,23,42,0.06)",
          minHeight: 60,
          "&:hover": { bgcolor: "#f7fff6", boxShadow: "0 6px 16px rgba(15,23,42,0.06)" },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", mr: 1.5 }}>
          <Avatar
            variant="square" // yuvarlak yerine kare
            sx={{
              bgcolor: "#fff",
              width: 50,
              height: 50,

            }}
          >
            <img
              src={sapLogo}
              alt="SAP"
              style={{ width: 50, height: 50, objectFit: "contain" }}
            />
          </Avatar>
        </Box>
        <Box sx={{ textAlign: "left" }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>SAP</Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Add SAP connection
          </Typography>
        </Box>
      </Button>

      {/* MSSQL kartı */}
      <Button
        onClick={() => handleOpen("MSSQL")}
        variant="outlined"
        sx={{
          width: 180,
          justifyContent: "flex-start",
          alignItems: "center",
          textTransform: "none",
          bgcolor: "#fff",
          borderRadius: 2,
          boxShadow: "0 4px 10px rgba(15,23,42,0.04)",
          p: 1.5,
          border: "1px solid rgba(15,23,42,0.06)",
          minHeight: 60,
          "&:hover": { bgcolor: "#f7fff6", boxShadow: "0 6px 16px rgba(15,23,42,0.06)" },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", mr: 1.5 }}>
          <Avatar
            variant="square" // yuvarlak yerine kare
            sx={{
              bgcolor: "#fff",
              width: 50,
              height: 50,

            }}
          >
            <img
              src={mssqlLogo}
              alt="MSSQL"
              style={{ width: 50, height: 50, objectFit: "contain" }}
            />
          </Avatar>
        </Box>
        <Box sx={{ textAlign: "left" }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>MSSQL</Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Add MSSQL connection
          </Typography>
        </Box>
      </Button>
    </Stack>
  );
}

export default DestinationList;