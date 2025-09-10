// server/test-server.js

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

// Bu log, doğru test kodunun çalıştığını kanıtlayacak
console.log(`--- BU BİR TEST SUNUCUSUDUR! --- Versiyon: ${new Date().toLocaleTimeString()} ---`);

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

// Test için SADECE TEK BİR endpoint tanımlıyoruz.
app.get('/api/templates', (req, res) => {
  // Eğer istek buraya ulaşırsa, terminalde bu mesajı göreceğiz.
  console.log(`✅✅✅ TEST: /api/templates yoluna GET isteği başarıyla ulaştı!`);

  // Tarayıcıya basit bir JSON yanıtı gönderiyoruz.
  res.status(200).json([
    { ID: 999, TEMPLATE_NAME: "Test Akışı Başarılı" }
  ]);
});

app.listen(PORT, () => {
  console.log(`🚀 TEST Sunucusu http://localhost:${PORT} adresinde çalışıyor`);
});