import React, { useState } from 'react';
import { Button, Box, Typography, Chip, Card, CardContent } from '@mui/material';
import TableSourcePopup from '../popup/table_source_popup.jsx';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import StorageIcon from '@mui/icons-material/Storage';

/**
 * TableSourceSelector Component
 * - Table source seçmek için popup açar
 * - Seçilen table source'u gösterir
 * - Parent component'a seçilen data'yı gönderir
 */
export default function TableSourceSelector({ onTableSourceSelect, selectedTableSource }) {
    const [popupOpen, setPopupOpen] = useState(false);

    const handleTableSourceSave = (tableSourceData) => {
        console.log('Selected table source:', tableSourceData);
        if (typeof onTableSourceSelect === 'function') {
            onTableSourceSelect(tableSourceData);
        }
    };

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
                Table Source Configuration
            </Typography>

            {/* Table Source Selection Button */}
            {!selectedTableSource ? (
                <Card sx={{ border: '2px dashed', borderColor: 'primary.main', bgcolor: 'primary.50' }}>
                    <CardContent sx={{ textAlign: 'center', py: 4 }}>
                        <AddCircleOutlineIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                        <Typography variant="h6" sx={{ mb: 1 }}>
                            Select Table Source
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Choose a database connection and select table with columns
                        </Typography>
                        <Button 
                            variant="contained" 
                            onClick={() => setPopupOpen(true)}
                            startIcon={<StorageIcon />}
                        >
                            Configure Table Source
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                /* Selected Table Source Display */
                <Card sx={{ border: '1px solid', borderColor: 'success.main', bgcolor: 'success.50' }}>
                    <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                            <Box>
                                <Typography variant="h6" color="success.dark">
                                    ✓ Table Source Configured
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Source is ready to use
                                </Typography>
                            </Box>
                            <Button 
                                size="small" 
                                onClick={() => setPopupOpen(true)}
                                variant="outlined"
                            >
                                Change
                            </Button>
                        </Box>
                        
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Box>
                                <Typography variant="body2" color="text.secondary">Connection:</Typography>
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                    {selectedTableSource.connectionName} ({selectedTableSource.connectionType})
                                </Typography>
                            </Box>
                            
                            <Box>
                                <Typography variant="body2" color="text.secondary">Table:</Typography>
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                    {selectedTableSource.fullTableName}
                                </Typography>
                            </Box>
                            
                            <Box>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                    Selected Columns ({selectedTableSource.columns.length}):
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {selectedTableSource.columns.map((column, index) => (
                                        <Chip 
                                            key={index}
                                            label={column}
                                            size="small"
                                            color="primary"
                                            variant="outlined"
                                        />
                                    ))}
                                </Box>
                            </Box>
                        </Box>
                    </CardContent>
                </Card>
            )}

            {/* Table Source Popup */}
            <TableSourcePopup
                open={popupOpen}
                setOpen={setPopupOpen}
                onSave={handleTableSourceSave}
            />
        </Box>
    );
}
