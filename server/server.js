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
const port = process.env.PORT || 3001;

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
<<<<<<< HEAD
app.post('/api/register', async (req, res) => { /* ... önceki kodla aynı ... */ });
=======
app.post('/api/register', async (req, res) => {
  const { username, name, surname, mail, password } = req.body;
  
  if (!username || !name || !surname || !mail || !password) {
    return res.status(400).json({ message: 'Tüm zorunlu alanları doldurun.' });
  }

  try {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    
    await transaction.begin();
    
    try {
      // 1. Kullanıcı adı kontrolü
      const userCheck = await transaction.request()
        .input('username', sql.NVarChar, username)
        .query('SELECT USER_NAME FROM [mosuser].[LOGIN_INFO] WHERE USER_NAME = @username');
      
      if (userCheck.recordset.length > 0) {
        await transaction.rollback();
        return res.status(400).json({ message: 'Bu kullanıcı adı zaten kullanılıyor.' });
      }

      // 2. Users tablosuna kaydet
      const hashedPassword = await bcryptjs.hash(password, 10);
      const userResult = await transaction.request()
        .input('username', sql.NVarChar, name) // USERNAME kolonuna isim
        .input('surname', sql.NVarChar, surname)
        .input('mail', sql.NVarChar, mail)
        .query('INSERT INTO [mosuser].[USERS] (USERNAME, SURNAME, MAIL, REC_DATE, STATUS) OUTPUT INSERTED.ID VALUES (@username, @surname, @mail, GETDATE(), 1)');
      
      const userId = userResult.recordset[0].ID;

      // 3. LOGIN_INFO tablosuna kaydet
      await transaction.request()
        .input('userId', sql.Int, userId)
        .input('username', sql.NVarChar, username)
        .input('password', sql.NVarChar, hashedPassword)
        .query('INSERT INTO [mosuser].[LOGIN_INFO] (USER_ID, USER_NAME, PASSWORD) VALUES (@userId, @username, @password)');

      await transaction.commit();
      res.status(201).json({ message: 'Kullanıcı başarıyla kaydedildi.' });
      
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error('Kayıt hatası:', err);
    res.status(500).json({ message: 'Kayıt sırasında bir hata oluştu.' });
  }
});
>>>>>>> 904e9564da8463057862b46e223b41ec4fe1fe72

// [POST] /api/login 
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: 'Kullanıcı adı ve şifre gereklidir.' });
  try {
    const pool = await poolPromise;
    const result = await pool.request().input('user_name', sql.NVarChar, username).query('SELECT u.ID as UserID, li.PASSWORD FROM [mosuser].[LOGIN_INFO] li JOIN [mosuser].[USERS] u ON li.USER_ID = u.ID WHERE li.USER_NAME = @user_name');
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
  console.log(`DEBUG - Template ${templateId} istendi, kullanıcı: ${userId}`);
  
  try {
    const pool = await poolPromise;
    
    // Önce template'in varlığını kontrol et
    const checkResult = await pool.request()
      .input('templateId', sql.Int, templateId)
      .query('SELECT ID, USER_ID, TEMPLATE_NAME FROM [mosuser].[TEMPLATES] WHERE ID = @templateId');
    
    console.log('DEBUG - Template check result:', checkResult.recordset);
    
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .input('templateId', sql.Int, templateId)
      .query('SELECT JSON FROM [mosuser].[TEMPLATES] WHERE ID = @templateId AND USER_ID = @userId');
    
    if (result.recordset.length > 0) {
      res.status(200).json(JSON.parse(result.recordset[0].JSON));
    } else {
      res.status(404).json({ message: 'Şablon bulunamadı veya bu şablona erişim yetkiniz yok.' });
    }
  } catch (err) {
    console.error('Template getirme hatası:', err);
    res.status(500).json({ message: 'Şablon yüklenemedi.' });
  }
});

app.post('/api/templates', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { templateName, jsonData } = req.body;
  if (!templateName || !jsonData) {
    return res.status(400).json({ message: 'Şablon adı ve akış verisi gereklidir.' });
  }
  
  // İsim benzersizlik kontrolü
  try {
    const pool = await poolPromise;
    const nameCheck = await pool.request()
      .input('userId', sql.Int, userId)
      .input('templateName', sql.NVarChar, templateName)
      .query('SELECT ID FROM [mosuser].[TEMPLATES] WHERE USER_ID = @userId AND TEMPLATE_NAME = @templateName');
    
    if (nameCheck.recordset.length > 0) {
      return res.status(400).json({ message: 'Bu isimde bir akış zaten mevcut.' });
    }

    const jsonDataString = JSON.stringify(jsonData);
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .input('templateName', sql.NVarChar, templateName)
      .input('json', sql.NVarChar, jsonDataString)
      .query('INSERT INTO [mosuser].[TEMPLATES] (USER_ID, TEMPLATE_NAME, JSON) OUTPUT INSERTED.ID VALUES (@userId, @templateName, @json)');
    
    res.status(201).json({ message: 'Akış başarıyla kaydedildi.', templateId: result.recordset[0].ID });
  } catch (err) {
    console.error('Template kaydetme hatası:', err);
    res.status(500).json({ message: 'Akış kaydedilirken bir hata oluştu.' });
  }
});

// [PUT] /api/templates/:id - Template güncelle
app.put('/api/templates/:id', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const templateId = req.params.id;
  const { templateName, jsonData } = req.body;
  
  if (!templateName || !jsonData) {
    return res.status(400).json({ message: 'Şablon adı ve akış verisi gereklidir.' });
  }

  try {
    const pool = await poolPromise;
    
    // Template'in kullanıcıya ait olup olmadığını kontrol et
    const ownerCheck = await pool.request()
      .input('userId', sql.Int, userId)
      .input('templateId', sql.Int, templateId)
      .query('SELECT ID FROM [mosuser].[TEMPLATES] WHERE ID = @templateId AND USER_ID = @userId');
    
    if (ownerCheck.recordset.length === 0) {
      return res.status(404).json({ message: 'Template bulunamadı veya erişim yetkiniz yok.' });
    }

    // İsim benzersizlik kontrolü (aynı ID hariç)
    const nameCheck = await pool.request()
      .input('userId', sql.Int, userId)
      .input('templateName', sql.NVarChar, templateName)
      .input('templateId', sql.Int, templateId)
      .query('SELECT ID FROM [mosuser].[TEMPLATES] WHERE USER_ID = @userId AND TEMPLATE_NAME = @templateName AND ID != @templateId');
    
    if (nameCheck.recordset.length > 0) {
      return res.status(400).json({ message: 'Bu isimde başka bir akış zaten mevcut.' });
    }

    const jsonDataString = JSON.stringify(jsonData);
    await pool.request()
      .input('userId', sql.Int, userId)
      .input('templateId', sql.Int, templateId)
      .input('templateName', sql.NVarChar, templateName)
      .input('json', sql.NVarChar, jsonDataString)
      .query('UPDATE [mosuser].[TEMPLATES] SET TEMPLATE_NAME = @templateName, JSON = @json WHERE ID = @templateId AND USER_ID = @userId');

    res.status(200).json({ message: 'Akış başarıyla güncellendi.' });
  } catch (err) {
    console.error('Template güncelleme hatası:', err);
    res.status(500).json({ message: 'Akış güncellenirken bir hata oluştu.' });
  }
});

// --- FLOW EXECUTION ENDPOINT'LERİ ---

// [POST] /api/templates/:id/execute - Template akışını çalıştır
app.post('/api/templates/:id/execute', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const templateId = req.params.id;
  
  try {
    const pool = await poolPromise;
    
    // Template'i ve JSON verisini getir
    const templateResult = await pool.request()
      .input('userId', sql.Int, userId)
      .input('templateId', sql.Int, templateId)
      .query('SELECT TEMPLATE_NAME, JSON FROM [mosuser].[TEMPLATES] WHERE ID = @templateId AND USER_ID = @userId');
    
    if (templateResult.recordset.length === 0) {
      return res.status(404).json({ message: 'Template bulunamadı veya erişim yetkiniz yok.' });
    }

    const templateData = JSON.parse(templateResult.recordset[0].JSON);
    const templateName = templateResult.recordset[0].TEMPLATE_NAME;
    
    console.log(`🚀 "${templateName}" akışı çalıştırılıyor...`);
    
    // Node'ları sırala ve çalıştır
    const executionResult = await executeFlowNodes(templateData.nodes, userId, pool);
    
    res.status(200).json({
      message: 'Akış başarıyla çalıştırıldı.',
      templateName: templateName,
      result: executionResult
    });
    
  } catch (err) {
    console.error('Flow execution hatası:', err);
    res.status(500).json({ message: 'Akış çalıştırılırken hata oluştu.' });
  }
});

// Flow node'larını işleyen ana fonksiyon
async function executeFlowNodes(nodes, userId, pool) {
  const results = [];
  
  for (const node of nodes) {
    console.log(`📋 Node işleniyor: ${node.type} - ${node.id}`);
    
    try {
      let nodeResult;
      
      switch (node.type) {
        case 'bapi':
          nodeResult = await processBapiNode(node, userId, pool);
          break;
        case 'query': 
          nodeResult = await processQueryNode(node, userId, pool);
          break;
        case 'file':
          nodeResult = await processFileNode(node, userId, pool);
          break;
        default:
          nodeResult = { type: node.type, status: 'skipped', message: 'Desteklenmeyen node tipi' };
      }
      
      results.push({ nodeId: node.id, ...nodeResult });
    } catch (err) {
      console.error(`Node ${node.id} işlenirken hata:`, err);
      results.push({ 
        nodeId: node.id, 
        status: 'error', 
        message: err.message 
      });
    }
  }
  
  return results;
}

// BAPI node işleme fonksiyonu
async function processBapiNode(node, userId, pool) {
  const config = node.data || {};
  
  return {
    type: 'bapi',
    status: 'success',
    message: `BAPI ${config.functionName || 'unknown'} çağrıldı`,
    data: { rows: 0 } // Simülasyon
  };
}

// Query node işleme fonksiyonu  
async function processQueryNode(node, userId, pool) {
  return {
    type: 'query',
    status: 'success', 
    message: 'Query başarıyla çalıştırıldı',
    data: { rows: 0 }
  };
}

// File node işleme fonksiyonu
async function processFileNode(node, userId, pool) {
  return {
    type: 'file',
    status: 'success',
    message: 'Dosya başarıyla oluşturuldu', 
    data: { path: '/tmp/output.xlsx' }
  };
}


// --- SOURCES YÖNETİMİ ENDPOINT'LERİ ---

// [GET] /api/sources - Kullanıcının kaydettiği source'ları listele
app.get('/api/sources', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { type } = req.query; // Query parameter ile type filtresi
  
  try {
    const pool = await poolPromise;
    let query = 'SELECT ID, TYPE, NAME FROM [mosuser].[SOURCE] WHERE USER_ID = @userId';
    
    if (type) {
      query += ' AND TYPE = @type';
    }
    
    query += ' ORDER BY ID DESC';
    
    const request = pool.request().input('userId', sql.Int, userId);
    
    if (type) {
      request.input('type', sql.NVarChar, type);
    }
    
    const result = await request.query(query);
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
app.listen(port,'0.0.0.0', () => {
  console.log(`🚀 Backend sunucusu http://localhost:${port} adresinde çalışıyor`);
});
