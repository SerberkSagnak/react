// FLEXILINKY/server/server.js --- JWT İÇİN GÜNCELLENMİŞ TAM KOD

import express from 'express';
import cors from 'cors';
import sql from 'mssql';
import bcryptjs from 'bcryptjs';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken'; // crypto ve cookieParser yerine jwt import edildi

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') }); 


const app = express();
const PORT = 3001;

// --- Veritabanı Kurulumu ---
const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};
const poolPromise = new sql.ConnectionPool(dbConfig)
  .connect()
  .then(pool => { console.log('✅ Veritabanına başarıyla bağlanıldı.'); return pool; })
  .catch(err => console.error('❌ Veritabanı bağlantısı BAŞARISIZ:', err));

// --- Middleware'ler ---
app.use(cors({ origin: 'http://localhost:5174', credentials: true }));
app.use(express.json());
// cookieParser'a artık ihtiyacımız yok

// --- YENİ GÜVENLİK MİDDLEWARE'İ (JWT KONTROLÜ) ---
const requireAuth = (req, res, next) => {
  const { authorization } = req.headers; // 'authorization' başlığını kontrol et
  if (!authorization) {
    return res.status(401).json({ message: 'Yetkilendirme token\'ı gerekli.' });
  }
  const token = authorization.split(' ')[1]; // "Bearer <token>" formatından token'ı al
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // Payload içindeki kullanıcı ID'sini ve adını isteğe (req) ekle
    req.user = { id: payload.userId, username: payload.username };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Geçersiz veya süresi dolmuş token.' });
  }
};

// --- KULLANICI YÖNETİMİ API ENDPOINT'LERİ ---

// [POST] /api/register (Değişiklik yok)
app.post('/api/register', async (req, res) => { /* ... önceki kodla aynı ... */ });

// [POST] /api/login (JWT OLUŞTURACAK ŞEKİLDE GÜNCELLENDİ)
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: 'Kullanıcı adı ve şifre gereklidir.' });
  try {
    const pool = await poolPromise;
    const result = await pool.request().input('user_name', sql.NVarChar, username).query('SELECT u.ID as UserID, li.PASSWORD FROM [mosuser].[LOGIN_INFO] li JOIN [mosuser].[Users] u ON li.USER_ID = u.ID WHERE li.USER_NAME = @user_name');
    if (result.recordset.length === 0) return res.status(401).json({ message: 'Geçersiz kullanıcı adı veya şifre.' });
    
    const user = result.recordset[0];
    const isMatch = await bcryptjs.compare(password, user.PASSWORD);
    if (!isMatch) return res.status(401).json({ message: 'Geçersiz kullanıcı adı veya şifre.' });
    
    // Sessions tablosu yerine JWT TOKEN OLUŞTUR
    const token = jwt.sign(
      { userId: user.UserID, username: username }, // Token'ın içine koyacağımız bilgi
      process.env.JWT_SECRET,
      { expiresIn: '1d' } // Token'ın geçerlilik süresi (örn: 1 gün)
    );
    
    // Token'ı ve başarı mesajını gönder
    res.status(200).json({ message: 'Giriş başarılı.', token: token });
  } catch (err) {
    console.error('Giriş hatası:', err);
    res.status(500).json({ message: 'Giriş sırasında bir sunucu hatası oluştu.' });
  }
});

// [POST] /api/logout (Artık frontend'de yönetildiği için bu endpoint'e gerek yok)
app.post('/api/logout', (req, res) => {
    res.status(200).json({ message: 'Çıkış işlemi frontend tarafından yönetilir.' });
});




// --- AKIŞ (TEMPLATE) YÖNETİMİ ENDPOINT'LERİ (requireAuth ile korunuyor) ---

app.get('/api/templates', requireAuth, async (req, res) => {
  const userId = req.user.id;
  try {
    const pool = await poolPromise;
    const result = await pool.request().input('userId', sql.Int, userId).query('SELECT ID, TEMPLATE_NAME FROM [mosuser].[TEMPLATES] WHERE USER_ID = @userId ORDER BY ID DESC');
    res.status(200).json(result.recordset);
  } catch (err) {
    res.status(500).json({ message: 'Şablon listesi getirilemedi.' });
  }
});

app.get('/api/templates/:id', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const templateId = req.params.id;
  try {
    const pool = await poolPromise;
    const result = await pool.request().input('userId', sql.Int, userId).input('templateId', sql.Int, templateId).query('SELECT JSON FROM [mosuser].[TEMPLATES] WHERE ID = @templateId AND USER_ID = @userId');
    if (result.recordset.length > 0) {
      res.status(200).json(JSON.parse(result.recordset[0].JSON));
    } else {
      res.status(404).json({ message: 'Şablon bulunamadı veya bu şablona erişim yetkiniz yok.' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Şablon yüklenemedi.' });
  }
});

app.post('/api/templates', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { templateName, jsonData } = req.body;
  if (!templateName || !jsonData) {
    return res.status(400).json({ message: 'Şablon adı ve akış verisi gereklidir.' });
  }
  const jsonDataString = JSON.stringify(jsonData);
  try {
    const pool = await poolPromise;
    await pool.request()
      .input('userId', sql.Int, userId).input('templateName', sql.NVarChar, templateName).input('json', sql.NVarChar, jsonDataString)
      .query('INSERT INTO [mosuser].[TEMPLATES] (USER_ID, TEMPLATE_NAME, JSON) VALUES (@userId, @templateName, @json)');
    res.status(201).json({ message: 'Akış başarıyla kaydedildi.' });
  } catch (err) {
    res.status(500).json({ message: 'Akış kaydedilirken bir hata oluştu.' });
  }
});


// --- Sunucuyu Dinlemeye Başla ---
app.listen(PORT, () => {
  console.log(`🚀 Backend sunucusu http://localhost:${PORT} adresinde çalışıyor`);
});