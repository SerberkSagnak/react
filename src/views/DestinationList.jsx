import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Stack,
  Avatar,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import StorageIcon from "@mui/icons-material/Storage";
import BusinessCenterIcon from "@mui/icons-material/BusinessCenter";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import BapiPopup from "../../popup/file_popup.jsx"; // senin popup

const DestinationList = () => {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);

  // Popup kontrolü
  const [openPopup, setOpenPopup] = useState(false);
  const [popupType, setPopupType] = useState("");
  const [selectedSource, setSelectedSource] = useState(null);

  // Silme onay popup state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Sayfa yüklendiğinde API'den liste çek
  useEffect(() => {
    const fetchSources = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/sources");
        const data = await res.json();
        setSources(data);
      } catch (error) {
        console.error("Liste alınamadı:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSources();
  }, []);

  // Yeni source ekleme (örnek)
  const handleAdd = () => {
    const newSource = {
      id: Date.now(),
      type: "hana",
      name: `Yeni Source ${sources.length + 1}`,
      description: "Localde eklenmiş örnek kayıt",
    };
    setSources((prev) => [...prev, newSource]);
  };

  // Silme popup aç
  const confirmDelete = (source) => {
    setDeleteTarget(source);
    setDeleteDialogOpen(true);
  };

  // Silme işlemi onaylandı
  const handleDeleteConfirmed = async () => {
    if (!deleteTarget) return;
    try {
      await fetch(`http://localhost:5000/api/sources/${deleteTarget.id}`, {
        method: "DELETE",
      });
      setSources((prev) => prev.filter((s) => s.id !== deleteTarget.id));
    } catch (error) {
      console.error("Silme hatası:", error);
    } finally {
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  };

  // Detay veya edit popup aç
  const handleDetails = (source) => {
    setPopupType(source.type === "hana" ? "Hana" : "SAP");
    setSelectedSource(source);
    setOpenPopup(true);
  };

  // İkon seçimi
  const getIcon = (type) => {
    if (type === "hana") {
      return (
        <Avatar sx={{ bgcolor: "#e8f0ff", width: 40, height: 40 }}>
          <StorageIcon sx={{ color: "#1976d2" }} />
        </Avatar>
      );
    }
    return (
      <Avatar sx={{ bgcolor: "#e9f7ee", width: 40, height: 40 }}>
        <BusinessCenterIcon sx={{ color: "#388e3c" }} />
      </Avatar>
    );
  };

  if (loading) {
    return <Typography sx={{ p: 2 }}>Loading...</Typography>;
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Set up a new destination
      </Typography>

      {/* Kart butonlar */}
      <DataSourceCards setOpenPopup={setOpenPopup} setPopupType={setPopupType} />

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
        {sources.map((s) => (
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
              <IconButton
                size="small"
                color="primary"
                onClick={() => handleDetails(s)}
              >
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                color="info"
                onClick={() => handleDetails(s)}
              >
                <InfoOutlinedIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                color="error"
                onClick={() => confirmDelete(s)}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        ))}

        {sources.length === 0 && (
          <Typography sx={{ textAlign: "center", color: "text.secondary", mt: 2 }}>
            Henüz source yok.
          </Typography>
        )}
      </Stack>

      {/* Detay popup */}
      <BapiPopup
        open={openPopup}
        setOpen={setOpenPopup}
        type={popupType}
        data={selectedSource}
      />

      {/* Silme onay popup */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Kaydı Sil</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {deleteTarget?.name} kaydını silmek istediğinize emin misiniz?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Vazgeç</Button>
          <Button color="error" onClick={handleDeleteConfirmed} autoFocus>
            Sil
          </Button>
        </DialogActions>
      </Dialog>
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
      <Button
        onClick={() => handleOpen("Hana")}
        variant="outlined"
        sx={{ width: 180, textTransform: "none" }}
      >
        <Avatar sx={{ bgcolor: "#e8f0ff", mr: 1 }}>
          <StorageIcon sx={{ color: "#1976d2" }} />
        </Avatar>
        <Box textAlign="left">
          <Typography variant="subtitle2">Hana DB</Typography>
          <Typography variant="caption" color="text.secondary">
            SAP HANA bağlantısı ekle
          </Typography>
        </Box>
      </Button>

      <Button
        onClick={() => handleOpen("SAP")}
        variant="outlined"
        sx={{ width: 180, textTransform: "none" }}
      >
        <Avatar sx={{ bgcolor: "#e9f7ee", mr: 1 }}>
          <BusinessCenterIcon sx={{ color: "#388e3c" }} />
        </Avatar>
        <Box textAlign="left">
          <Typography variant="subtitle2">SAP</Typography>
          <Typography variant="caption" color="text.secondary">
            BAPI / RFC bağlantısı ekle
          </Typography>
        </Box>
      </Button>
    </Stack>
  );
}

export default DestinationList;