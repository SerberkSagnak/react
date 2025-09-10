// FLEXILINKY/server/server.js --- JWT İÇİN GÜNCELLENMİŞ TAM KOD

import express from 'express';
import cors from 'cors';
import sql from 'mssql';
import hana from "@sap/hana-client";
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken'; // crypto ve cookieParser yerine jwt import edildi
import dotenv from 'dotenv';
dotenv.config(); // .env server klasöründe ise bu yeterli


import path from 'path';
import { fileURLToPath } from 'url';
import { Client } from 'node-rfc';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });


const app = express();
const PORT = 3001;

// --- Veritabanı Kurulumu --- MSSQL MAİN DB
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
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
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

// [POST] /api/register 
app.post('/api/register', async (req, res) => { /* ... önceki kodla aynı ... */ });

// [POST] /api/login 
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


// --- SOURCES YÖNETİMİ ENDPOINT'LERİ ---

// [GET] /api/sources - Kullanıcının kaydettiği source'ları listele
app.get('/api/sources', requireAuth, async (req, res) => {
  const userId = req.user.id;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .query('SELECT ID, TYPE, NAME FROM [mosuser].[SOURCE] WHERE USER_ID = @userId ORDER BY ID DESC');
    res.status(200).json(result.recordset);
  } catch (err) {
    console.error('Sources listesi getirme hatası:', err);
    res.status(500).json({ message: 'Sources listesi getirilemedi.' });
  }
});

// [POST] /api/sources - Yeni source kaydet
// --- DÜZELTİLMİŞ: POST /api/sources (kaydetme) ---
// açıklama: transaction kullanımı düzgün, OUTPUT INSERTED.ID sonucu doğru okunuyor
app.post('/api/sources', requireAuth, async (req, res) => {
  const userId = req.user.id; // requireAuth middleware tarafından set ediliyor
  const { name, type, details } = req.body;

  // validation
  if (!name || !type || !details) {
    return res.status(400).json({ message: 'The name, type, and details fields are required' });
  }
  if (!['HANA', 'SAP', 'MSSQL'].includes(type)) {//yeni eklenecek sources'in olabilecek typları
    return res.status(400).json({ message: 'Only specified types can be save' });
  }

  try {
    const pool = await poolPromise; // ana pool bağlantısı
    const transaction = new sql.Transaction(pool);

    await transaction.begin();

    try {
      // 1) SOURCE insert - OUTPUT INSERTED.ID ile dönülen id'yi al
      const insertResult = await transaction.request()
        .input('userId', sql.Int, userId)
        .input('name', sql.NVarChar, name)
        .input('type', sql.NVarChar, type)
        .query('INSERT INTO [mosuser].[SOURCE] (USER_ID, NAME, TYPE) OUTPUT INSERTED.ID AS ID VALUES (@userId, @name, @type)');

      const sourceId = insertResult.recordset?.[0]?.ID;
      if (!sourceId) throw new Error('Source ID alınamadı.');

      // 2) Details'leri SOURCE_INFO tablosuna ekle
      for (const [property, value] of Object.entries(details)) {
        await transaction.request()
          .input('sourceId', sql.Int, sourceId)
          .input('property', sql.NVarChar, property)
          .input('value', sql.NVarChar, value ?? '')
          .query('INSERT INTO [mosuser].[SOURCE_INFO] (SOURCE_ID, PROPERTY, VALUE) VALUES (@sourceId, @property, @value)');
      }

      await transaction.commit();
      return res.status(201).json({ message: 'Source başarıyla kaydedildi.', sourceId });

    } catch (err) {
      // transaction sırasında hata olursa rollback
      await transaction.rollback();
      console.error('Source transaction hatası:', err);
      return res.status(500).json({ message: 'Source kaydedilirken bir hata oluştu.' });
    }
  } catch (err) {
    console.error('Source kayıt genel hatası:', err);
    return res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

// test connection
// --- DÜZELTİLMİŞ: POST /api/sources/test (bağlantı testi) ---
// açıklama: dbConnectiontest önce tanımlanır, pool üst scope'ta tutulur, hata durumunda JSON dönülür
app.post('/api/sources/test', requireAuth, async (req, res) => {
  const { details, type, source } = req.body;

  if (!details) return res.status(400).json({ message: 'Details alanı gereklidir.' });

  let PoolTestConnection; // finally içinde erişebilmek için üst scope
  //MSSQL bağlantı
  const dbConnectionMSSQL = {
    user: details.user,
    password: details.password,
    server: details.host,
    database: details.database,
    options: {
      encrypt: true,
      trustServerCertificate: true,
    }
  };

  //hana bağlantı

  // options örneği: host + port ayrı kullanımı (en yaygın)
  const dbConnectiontestHANADB = {
    host: details.host,   // HANA host
    port: details.port,   // servis portu
    uid: details.user,   // kullanıcı
    pwd: details.password,  // parola (prod'ta secret manager kullan)           
    encrypt: true,        // TLS kullan
    sslValidateCertificate: false,   // self-signed test için (prod'ta true yap)
    connectTimeout: 15000 // ms

  }


  //sap bağlantı bilgileri alma
  const dbConnectionTestSAP = {
    user: details.user,
    passwd: details.password,
    ashost: details.host,  // ASHOST
    sysnr: details.sysnr,
    port: "3200"   // Sistem numarası
  }
  try {
    // veritabanına bağlanma denemesi
    // 
    switch (type) {
      case "HANA":
        // HANA bağlantısı
        PoolTestConnection = await new hana.createConnection(dbConnectiontestHANADB).connect();
        console.log("HANA bağlantısı başarılı!");
        break;

      case "MSSQL":
        // MSSQL bağlantısı
        PoolTestConnection = await new sql.ConnectionPool(dbConnectionMSSQL).connect();
        console.log("MSSQL bağlantısı başarılı!");
        break;

      case "SAP":
        // SAP Application Server bağlantısı
        PoolTestConnection = await new Client(dbConnectionTestSAP).open();
        console.log("SAP Application Server bağlantısı başarılı!");
        break;

      default:
        throw new Error(`Desteklenmeyen veritabanı tipi: ${type}`);
    }

    // opsiyonel kısa sorgu ile test edebilirsin
    // await pool.request().query('SELECT 1 AS ok');

    return res.status(200).json({ message: 'Database connection successful' });
  } catch (err) {
    console.error('Test connection error:', err);
    return res.status(500).json({ message: err.message || 'Bağlantı testi başarısız.' });
  } finally {
    if (PoolTestConnection) {
      try { await PoolTestConnection.close(); } catch (e) { console.error('PoolTestConnection close error:', e); }
    }
  }
});

// [GET] /api/sources/:id - Belirli bir source'un detaylarını getir
app.get('/api/sources/:id', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const sourceId = req.params.id;

  try {
    const pool = await poolPromise;

    // Source'un kullanıcıya ait olup olmadığını kontrol et
    const sourceResult = await pool.request()
      .input('userId', sql.Int, userId)
      .input('sourceId', sql.Int, sourceId)
      .query('SELECT ID, TYPE, NAME FROM [mosuser].[SOURCE] WHERE ID = @sourceId AND USER_ID = @userId');

    if (sourceResult.recordset.length === 0) {
      return res.status(404).json({ message: 'Source bulunamadı veya erişim yetkiniz yok.' });
    }

    const source = sourceResult.recordset[0];

    // Details'leri getir
    const detailsResult = await pool.request()
      .input('sourceId', sql.Int, sourceId)
      .query('SELECT PROPERTY, VALUE FROM [mosuser].[SOURCE_INFO] WHERE SOURCE_ID = @sourceId');

    // Details'leri obje formatına çevir
    const details = {};
    detailsResult.recordset.forEach(row => {
      details[row.PROPERTY] = row.VALUE;
    });

    res.status(200).json({
      id: source.ID,
      name: source.NAME,
      type: source.TYPE,
      details: details
    });

  } catch (err) {
    console.error('Source detayları getirme hatası:', err);
    res.status(500).json({ message: 'Source detayları getirilemedi.' });
  }
});

// [DELETE] /api/sources/:id - Belirli bir source'u (ve ona bağlı SOURCE_INFO kayıtlarını) sil
app.delete('/api/sources/:id', requireAuth, async (req, res) => {
  const userId = req.user.id;                      // requireAuth middleware'ından gelen kullanıcı id'si
  const sourceId = parseInt(req.params.id, 10);    // URL'den gelen source id'sini integer'a çevir

  if (Number.isNaN(sourceId)) {                    // Geçerli bir id değilse 400 dön
    return res.status(400).json({ message: 'Geçersiz source id.' });
  }

  try {
    const pool = await poolPromise;

    // 2) Transaction başlat (silme işlemleri atomik olacak)
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // 2a) SOURCE_INFO tablosundaki ilişkili satırları sil
      await transaction.request()
        .input('sourceId', sql.Int, sourceId)
        .query('DELETE FROM [mosuser].[SOURCE_INFO] WHERE SOURCE_ID = @sourceId');

      // 2b) SOURCE tablosundan kaydı sil
      await transaction.request()
        .input('sourceId', sql.Int, sourceId)
        .query('DELETE FROM [mosuser].[SOURCE] WHERE ID = @sourceId');

      // 2c) Commit
      await transaction.commit();

      // Başarılı silme yanıtı
      return res.status(200).json({ message: 'Source ve ilişkili bilgiler başarıyla silindi.' });

    } catch (innerErr) {
      // Bir hata olursa rollback yap
      await transaction.rollback();
      console.error('Source silme işlemi sırasında hata (transaction):', innerErr);
      return res.status(500).json({ message: 'Source silinirken hata oluştu.' });
    }

  } catch (err) {
    // Genel hata yakalama
    console.error('Source silme hatası:', err);
    return res.status(500).json({ message: 'Source silme isteği işlenemedi.' });
  }
});
//popup sources details getirme












// --- DESTİNATİON ENDPOINT'LERİ ---

// [GET] /api/sources - Kullanıcının kaydettiği source'ları listele
app.get('/api/destination', requireAuth, async (req, res) => {
  const userId = req.user.id;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .query('SELECT ID, TYPE, NAME FROM [mosuser].[DESTINATION] WHERE USER_ID = @userId ORDER BY ID DESC');
    res.status(200).json(result.recordset);
  } catch (err) {
    console.error('Destination listesi getirme hatası:', err);
    res.status(500).json({ message: 'Destination listesi getirilemedi.' });
  }
});

// [POST] /api/destination - Yeni destinationa kaydet
app.post('/api/destination', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { name, type, details } = req.body;

  if (!name || !type || !details) {
    return res.status(400).json({ message: 'Name, type ve details alanları gereklidir.' });
  }

  if (!['HANA', 'SAP', 'MSSQL'].includes(type)) {
    return res.status(400).json({ message: 'Type sadece HANA veya SAP olabilir.' });
  }

  try {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);

    await transaction.begin();

    try {
      // 1. Source'u kaydet
      const destinationResult = await transaction.request()
        .input('userId', sql.Int, userId)
        .input('name', sql.NVarChar, name)
        .input('type', sql.NVarChar, type)
        .query('INSERT INTO [mosuser].[DESTİNATİON] (USER_ID, NAME, TYPE) OUTPUT INSERTED.ID VALUES (@userId, @name, @type)');

      const destinationId = destinationResult.recordset[0].ID;

      // 2. Details'leri kaydet
      for (const [property, value] of Object.entries(details)) {
        if (property !== 'password' && value) { // Şifreleri kaydetme
          await transaction.request()
            .input('destinationId', sql.Int, destinationId)
            .input('property', sql.NVarChar, property)
            .input('value', sql.NVarChar, value)
            .query('INSERT INTO [mosuser].[DESTINATION_INFO] (DESTINATION_ID, PROPERTY, VALUE) VALUES (@destinationId, @property, @value)');
        }
      }

      await transaction.commit();
      res.status(201).json({ message: 'Destination başarıyla kaydedildi.', sourceId: sourceId });

    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error('Destination kaydetme hatası:', err);
    res.status(500).json({ message: 'Destination kaydedilirken bir hata oluştu.' });
  }
});

// [GET] /api/destination/:id - Belirli bir source'un detaylarını getir
app.get('/api/destination/:id', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const sourceId = req.params.id;

  try {
    const pool = await poolPromise;

    // Source'un kullanıcıya ait olup olmadığını kontrol et
    const sourceResult = await pool.request()
      .input('userId', sql.Int, userId)
      .input('destinationId', sql.Int, sourceId)
      .query('SELECT ID, TYPE, NAME FROM [mosuser].[DESTINATION] WHERE ID = @destınatıonID AND USER_ID = @userId');

    if (sourceResult.recordset.length === 0) {
      return res.status(404).json({ message: 'Destination bulunamadı veya erişim yetkiniz yok.' });
    }

    const destination = sourceResult.recordset[0];

    // Details'leri getir
    const detailsResult = await pool.request()
      .input('destinationId', sql.Int, sourceId)
      .query('SELECT PROPERTY, VALUE FROM [mosuser].[DESTINATION_INFO] WHERE DESTINATION_ID = @destination');

    // Details'leri obje formatına çevir
    const details = {};
    detailsResult.recordset.forEach(row => {
      details[row.PROPERTY] = row.VALUE;
    });

    res.status(200).json({
      id: destination.ID,
      name: destination.NAME,
      type: destination.TYPE,
      details: details
    });

  } catch (err) {
    console.error('Destination detayları getirme hatası:', err);
    res.status(500).json({ message: 'Destination detayları getirilemedi.' });
  }
});


// --- Sunucuyu Dinlemeye Başla ---
app.listen(PORT, () => {
  console.log(`🚀 Backend sunucusu http://localhost:${PORT} adresinde çalışıyor`);
});