import React, { useState, useEffect } from "react";
import {
    Box,
    Typography,
    Button,
    Stack,
    Avatar,
    IconButton,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import StorageIcon from "@mui/icons-material/Storage";
import BusinessCenterIcon from "@mui/icons-material/BusinessCenter";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import BapiPopup from "../../popup/file_popup.jsx"; // popup component

const Sources = () => {
    const [sources, setSources] = useState([]);
    const [loading, setLoading] = useState(true);

    // Popup control
    const [openPopup, setOpenPopup] = useState(false);
    const [popupType, setPopupType] = useState("");
    const [selectedSource, setSelectedSource] = useState(null);

    // Fetch sources list from API
    const fetchSources = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/sources', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                setSources(data.map(s => ({
                    id: s.ID,
                    type: s.TYPE.toLowerCase(),
                    name: s.NAME,
                    description: `${s.TYPE} connection`
                })));
            }
        } catch (err) {
            console.error('Could not fetch sources:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSources();
    }, []);

    // Delete record
    const handleDelete = (id) => {
        setSources((prev) => prev.filter((s) => s.id !== id));
    };

    // Open popup when details or edit button is clicked
    const handleDetails = (source) => {
        setPopupType(source.type === "hana" ? "Hana" : "SAP");
        setSelectedSource(source);
        setOpenPopup(true);
    };

    // Icon selection
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

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h5" sx={{ mb: 2 }}>
                Set up a new sources
            </Typography>

            {/* Card buttons */}
            <DataSourceCards openPopup={openPopup} setOpenPopup={setOpenPopup} setPopupType={setPopupType} />

            <hr className="my-4 border-t border-gray-300" />

            {/* List */}
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
                            {/* Edit button */}
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

                            {/* Details button */}
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

                            {/* Delete button */}
                            <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDelete(s.id)}
                                sx={{
                                    border: "1px solid #d0d7ff",
                                    bgcolor: "#f5f7ff",
                                    "&:hover": { bgcolor: "#eef3ff" },
                                }}
                            >
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </Box>
                    </Box>
                ))}

                {sources.length === 0 && (
                    <Typography sx={{ textAlign: "center", color: "text.secondary", mt: 2 }}>
                        No sources yet.
                    </Typography>
                )}
            </Stack>

            {/* Popup */}
            <BapiPopup
                open={openPopup}
                setOpen={setOpenPopup}
                type={popupType}
                data={selectedSource}
                onSave={() => fetchSources()} // Refresh list after saving
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
            {/* Hana DB card */}
            <Button
                onClick={() => handleOpen("Hana")}
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
                    <Avatar sx={{ bgcolor: "#e8f0ff", width: 36, height: 36 }}>
                        <StorageIcon sx={{ color: "#1976d2" }} />
                    </Avatar>
                </Box>
                <Box sx={{ textAlign: "left" }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Hana DB</Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>Add SAP HANA connection</Typography>
                </Box>
            </Button>

            {/* SAP card */}
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
                    <Avatar sx={{ bgcolor: "#e9f7ee", width: 36, height: 36 }}>
                        <BusinessCenterIcon sx={{ color: "#388e3c" }} />
                    </Avatar>
                </Box>
                <Box sx={{ textAlign: "left" }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>SAP</Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>BAPI / RFC connection</Typography>
                </Box>
            </Button>
        </Stack>
    );
}

export default Sources;