import React, { useState } from 'react';
import { Box, Typography, Paper, Alert } from '@mui/material';
import TableSourceSelector from '../components/TableSourceSelector';

/**
 * TableSourceExample Page
 * - TableSourceSelector component'ını nasıl kullanacağını gösterir
 * - Seçilen table source data'sını gösterir
 */
export default function TableSourceExample() {
    const [selectedTableSource, setSelectedTableSource] = useState(null);

    const handleTableSourceSelect = (tableSourceData) => {
        console.log('Parent received table source:', tableSourceData);
        setSelectedTableSource(tableSourceData);
    };

    return (
        <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
            <Typography variant="h4" sx={{ mb: 3 }}>
                Table Source Configuration Example
            </Typography>
            
            <Alert severity="info" sx={{ mb: 3 }}>
                This page demonstrates how to use TableSourcePopup to select database tables and columns.
            </Alert>

            {/* Table Source Selector */}
            <Paper sx={{ p: 2, mb: 3 }}>
                <TableSourceSelector 
                    onTableSourceSelect={handleTableSourceSelect}
                    selectedTableSource={selectedTableSource}
                />
            </Paper>

            {/* Selected Data Display */}
            {selectedTableSource && (
                <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                        Selected Table Source Data:
                    </Typography>
                    <Box component="pre" sx={{ 
                        bgcolor: 'grey.100', 
                        p: 2, 
                        borderRadius: 1, 
                        overflow: 'auto',
                        fontSize: '0.875rem'
                    }}>
                        {JSON.stringify(selectedTableSource, null, 2)}
                    </Box>
                </Paper>
            )}
        </Box>
    );
}
