import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';

// setViewMode fonksiyonunu prop olarak alacak
const DestinationList = ({ setViewMode }) => {
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" component="h2">
          Destinations (List)
        </Typography>
        <Button variant="contained" onClick={() => setViewMode('new')}>
          Yeni
        </Button>
      </Box>
      <Paper sx={{
        height: '60vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#e3f2fd', // Açık mavi arka plan
        color: '#555'
      }}>
        <Typography>
          Önceden oluşturulmuş Destination listesi burada görünecek. (Edit/Delete/Details)
        </Typography>
      </Paper>
    </Box>
  );
};

export default DestinationList;