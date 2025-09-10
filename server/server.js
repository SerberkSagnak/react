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
const port = process.env.PORT || 3001;

// dist klasörünü serve et
app.use(express.static(path.join(__dirname, '../dist')));

// SPA fallback: tüm route’ları index.html’e yönlendir
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});



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

// [POST] /api/login (JWT OLUŞTURACAK ŞEKİLDE GÜNCELLENDİ)
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
app.post('/api/sources', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { name, type, details } = req.body;
  
  if (!name || !type || !details) {
    return res.status(400).json({ message: 'Name, type ve details alanları gereklidir.' });
  }

  if (!['HANA', 'SAP'].includes(type)) {
    return res.status(400).json({ message: 'Type sadece HANA veya SAP olabilir.' });
  }

  try {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    
    await transaction.begin();
    
    try {
      // 1. Source'u kaydet
      const sourceResult = await transaction.request()
        .input('userId', sql.Int, userId)
        .input('name', sql.NVarChar, name)
        .input('type', sql.NVarChar, type)
        .query('INSERT INTO [mosuser].[SOURCE] (USER_ID, NAME, TYPE) OUTPUT INSERTED.ID VALUES (@userId, @name, @type)');
      
      const sourceId = sourceResult.recordset[0].ID;

      // 2. Details'leri kaydet
      for (const [property, value] of Object.entries(details)) {
        if (property !== 'password' && value) { // Şifreleri kaydetme
          await transaction.request()
            .input('sourceId', sql.Int, sourceId)
            .input('property', sql.NVarChar, property)
            .input('value', sql.NVarChar, value)
            .query('INSERT INTO [mosuser].[SOURCE_INFO] (SOURCE_ID, PROPERTY, VALUE) VALUES (@sourceId, @property, @value)');
        }
      }

      await transaction.commit();
      res.status(201).json({ message: 'Source başarıyla kaydedildi.', sourceId: sourceId });
      
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error('Source kaydetme hatası:', err);
    res.status(500).json({ message: 'Source kaydedilirken bir hata oluştu.' });
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

// --- Sunucuyu Dinlemeye Başla ---
app.listen(port,'0.0.0.0', () => {
  console.log(`🚀 Backend sunucusu http://localhost:${port} adresinde çalışıyor`);
});
