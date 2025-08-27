import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import ButtonBase from '@mui/material/ButtonBase'; // Tıklanabilir alan için
import Avatar from '@mui/material/Avatar';

// Örnek ikonlu buton stili
const SelectionButton = ({ label, icon, onClick }) => (
  <ButtonBase
    onClick={onClick}
    sx={{
      width: '100%',
      border: '1px solid #ddd',
      borderRadius: '8px',
      p: 2,
      '&:hover': {
        borderColor: '#1976d2',
        backgroundColor: '#f5f5f5'
      }
    }}
  >
    <Avatar sx={{ bgcolor: '#e3f2fd', color: '#1976d2', mr: 2 }}>{icon}</Avatar>
    <Typography>{label}</Typography>
  </ButtonBase>
);


const NewDestination = () => {
  return (
    <Box>
      <Typography variant="h5" component="h2" sx={{ mb: 2 }}>
        Destinations (New)
      </Typography>
      <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
         <Typography variant="body1" sx={{ mb: 1 }}>
          Başlangıç olarak, aşağıda 2 buton olsun... SAP, Hana DB olsun... Butonların şekli ikonlu olsun...
        </Typography>

        <SelectionButton 
          label="SAP" 
          icon="S"
          onClick={() => alert('SAP pop-up açılacak...')} // Şimdilik bir uyarı gösteriyor
        />
        <SelectionButton
          label="Hana DB"
          icon="H"
          onClick={() => alert('Hana DB pop-up açılacak...')} // Şimdilik bir uyarı gösteriyor
        />
      </Paper>
    </Box>
  );
};

export default NewDestination;