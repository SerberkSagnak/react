// FLEXILINKY/server/server.js --- JWT İÇİN GÜNCELLENMİŞ TAM KOD

import express from 'express';
import cors from 'cors';
import sql from 'mssql';
import hana from "@sap/hana-client";
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import process from 'process';
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
  } catch (_err) {
    return res.status(401).json({ message: 'Geçersiz veya süresi dolmuş token.' });
  }
};

// --- KULLANICI YÖNETİMİ API ENDPOINT'LERİ ---

// [POST] /api/register 
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: 'Kullanıcı adı ve şifre gereklidir.' });
  
  try {
    const pool = await poolPromise;
    const hashedPassword = await bcryptjs.hash(password, 12);
    
    // Kullanıcı var mı kontrol et
    const userCheck = await pool.request()
      .input('username', sql.NVarChar, username)
      .query('SELECT u.ID FROM [mosuser].[Users] u JOIN [mosuser].[LOGIN_INFO] li ON u.ID = li.USER_ID WHERE li.USER_NAME = @username');
    
    if (userCheck.recordset.length > 0) {
      return res.status(409).json({ message: 'Bu kullanıcı adı zaten kayıtlı.' });
    }
    
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    
    try {
      // Kullanıcı oluştur
      const userResult = await transaction.request()
        .input('username', sql.NVarChar, username)
        .query('INSERT INTO [mosuser].[Users] (USER_NAME) OUTPUT INSERTED.ID VALUES (@username)');
      
      const userId = userResult.recordset[0].ID;
      
      // Login info ekle
      await transaction.request()
        .input('userId', sql.Int, userId)
        .input('username', sql.NVarChar, username)
        .input('password', sql.NVarChar, hashedPassword)
        .query('INSERT INTO [mosuser].[LOGIN_INFO] (USER_ID, USER_NAME, PASSWORD) VALUES (@userId, @username, @password)');
      
      await transaction.commit();
      res.status(201).json({ message: 'Kullanıcı başarıyla kaydedildi.' });
      
    } catch (innerErr) {
      await transaction.rollback();
      throw innerErr;
    }
  } catch (_err) {
    res.status(500).json({ message: 'Kayıt sırasında bir sunucu hatası oluştu.' });
  }
});

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
  } catch (_err) {
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
  } catch (_err) {
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
  } catch (_err) {
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
  const { details, type } = req.body;

  if (!details) return res.status(400).json({ message: 'Details alanı gereklidir.' });

  let PoolTestConnection; // finally içinde erişebilmek için üst scope
  //MSSQL bağlantı
  const dbConnectionMSSQL = {
    user: details.user || details.username || details.User || details.Username,
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
    serverNode: `${details.host}:${details.port || '443'}`, // HANA Cloud format
    uid: details.user || details.username,   // kullanıcı
    pwd: details.password,  // parola           
    encrypt: true,        // SSL zorunlu
    sslValidateCertificate: false,   // HANA Cloud için
    connectTimeout: 30000, // HANA Cloud için daha uzun timeout
    sslTrustStore: '',    // HANA Cloud için
    sslHostNameInCertificate: '*'  // HANA Cloud wildcard sertifikaları için
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
      // Ownership kontrolü
      const ownership = await transaction.request()
        .input('sourceId', sql.Int, sourceId)
        .input('userId', sql.Int, userId)
        .query('SELECT ID FROM [mosuser].[SOURCE] WHERE ID = @sourceId AND USER_ID = @userId');

      if (!ownership.recordset || ownership.recordset.length === 0) {
        await transaction.rollback();
        return res.status(403).json({ message: 'Bu kaynağı silme yetkiniz yok.' });
      }

      // 2a) SOURCE_INFO tablosundaki ilişkili satırları sil
      await transaction.request()
        .input('sourceId', sql.Int, sourceId)
        .query('DELETE FROM [mosuser].[SOURCE_INFO] WHERE SOURCE_ID = @sourceId');

      // 2b) SOURCE tablosundan kaydı sil
      await transaction.request()
        .input('sourceId', sql.Int, sourceId)
        .input('userId', sql.Int, userId)
        .query('DELETE FROM [mosuser].[SOURCE] WHERE ID = @sourceId AND USER_ID = @userId');

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

// --- YENİ ENDPOINT'LER: Schema, Table, Column listesi için ---

// [POST] /api/sources/schemas - Bağlantıdan schema listesi al
app.post('/api/sources/schemas', requireAuth, async (req, res) => {
  const { details, type } = req.body;
  
  console.log('🔍 Schema endpoint called:', { type, details: details ? 'EXISTS' : 'NULL' });
  
  if (!details) {
    console.error('❌ Details missing from request body');
    return res.status(400).json({ message: 'Details alanı gereklidir.' });
  }

  let connection;
  try {
    if (type === "HANA") {
      connection = await new hana.createConnection({
        serverNode: `${details.host}:${details.port || '443'}`,
        uid: details.user,
        pwd: details.password,
        encrypt: true,
        sslValidateCertificate: false,
        connectTimeout: 30000,
        sslHostNameInCertificate: '*'
      }).connect();
      
      const result = await connection.exec("SELECT SCHEMA_NAME FROM SCHEMAS WHERE HAS_PRIVILEGES='TRUE' ORDER BY SCHEMA_NAME");
      const schemas = result.map(row => row.SCHEMA_NAME);
      res.json({ schemas });
      
    } else if (type === "MSSQL") {
    // Test connection ile tamamen aynı config kullan
    const testConnectionMSSQL = {
    user: details.user || details.username || details.User || details.Username,
    password: details.password,
    server: details.host,
    database: details.database,
      options: {
        encrypt: true,
        trustServerCertificate: true,
    }
    };
    
    console.log('🔍 MSSQL exact test config:', {
    user: testConnectionMSSQL.user,
    server: testConnectionMSSQL.server,
    database: testConnectionMSSQL.database,
    password: testConnectionMSSQL.password ? 'EXISTS' : 'NULL'
    });
    
    connection = await new sql.ConnectionPool(testConnectionMSSQL).connect();
      console.log('✅ MSSQL destination schema connection successful');
      const result = await connection.request().query("SELECT name as schema_name FROM sys.schemas WHERE name NOT IN ('sys', 'INFORMATION_SCHEMA') ORDER BY name");
      const schemas = result.recordset.map(row => row.schema_name);
      res.json({ schemas });
    }
  } catch (err) {
    console.error('❌ Schema listesi hatası:', err.message || err);
    res.status(500).json({ message: `Schema bilgileri alınamadı: ${err.message}` });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (e) { console.error('Connection close error:', e); }
    }
  }
});

// [POST] /api/sources/tables - Schema'dan table listesi al
app.post('/api/sources/tables', requireAuth, async (req, res) => {
  const { details, type, schema } = req.body;
  
  if (!details || !schema) return res.status(400).json({ message: 'Details ve schema gereklidir.' });

  let connection;
  try {
    if (type === "HANA") {
      connection = await new hana.createConnection({
        serverNode: `${details.host}:${details.port || '443'}`,
        uid: details.user,
        pwd: details.password,
        encrypt: true,
        sslValidateCertificate: false,
        connectTimeout: 30000,
        sslHostNameInCertificate: '*'
      }).connect();
      
      const result = await connection.exec(`SELECT TABLE_NAME FROM TABLES WHERE SCHEMA_NAME = '${schema}' ORDER BY TABLE_NAME`);
      const tables = result.map(row => row.TABLE_NAME);
      res.json({ tables });
      
    } else if (type === "MSSQL") {
    console.log('🔍 Using exact test connection config');
    
    // Test connection config'ini birebir kopyala
    const testConfig = {
    user: details.user || details.username,
    password: details.password,
      server: details.host,
        database: details.database,
        options: {
          encrypt: true,
          trustServerCertificate: true,
        }
      };
      console.log('🔍 MSSQL config:', testConfig);
      
      connection = await new sql.ConnectionPool(testConfig).connect();
      console.log('✅ MSSQL destination schema connection successful');
      
      const result = await connection.request().query(`SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = '${schema}' AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME`);
      const tables = result.recordset.map(row => row.TABLE_NAME);
      res.json({ tables });
    }
  } catch (err) {
    console.error('Table listesi hatası:', err);
    res.status(500).json({ message: 'Table bilgileri alınamadı.' });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (e) { console.error('Connection close error:', e); }
    }
  }
});

// [POST] /api/sources/columns - Table'dan column listesi al
app.post('/api/sources/columns', requireAuth, async (req, res) => {
  const { details, type, schema, table } = req.body;
  
  if (!details || !schema || !table) return res.status(400).json({ message: 'Details, schema ve table gereklidir.' });

  let connection;
  try {
    if (type === "HANA") {
      connection = await new hana.createConnection({
        serverNode: `${details.host}:${details.port || '443'}`,
        uid: details.user,
        pwd: details.password,
        encrypt: true,
        sslValidateCertificate: false,
        connectTimeout: 30000,
        sslHostNameInCertificate: '*'
      }).connect();
      
      const result = await connection.exec(`SELECT COLUMN_NAME, DATA_TYPE_NAME, LENGTH, IS_NULLABLE FROM COLUMNS WHERE SCHEMA_NAME = '${schema}' AND TABLE_NAME = '${table}' ORDER BY POSITION`);
      const columns = result.map(row => ({
        name: row.COLUMN_NAME,
        type: row.DATA_TYPE_NAME,
        length: row.LENGTH,
        nullable: row.IS_NULLABLE === 'TRUE'
      }));
      res.json({ columns });
      
    } else if (type === "MSSQL") {
      connection = await new sql.ConnectionPool({
        user: details.user || details.username || details.User || details.Username,
        password: details.password,
        server: details.host,
        database: details.database,
        options: { encrypt: true, trustServerCertificate: true }
      }).connect();
      
      const result = await connection.request().query(`
        SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = '${schema}' AND TABLE_NAME = '${table}' 
        ORDER BY ORDINAL_POSITION
      `);
      const columns = result.recordset.map(row => ({
        name: row.COLUMN_NAME,
        type: row.DATA_TYPE,
        length: row.CHARACTER_MAXIMUM_LENGTH,
        nullable: row.IS_NULLABLE === 'YES'
      }));
      res.json({ columns });
    }
  } catch (err) {
    console.error('Column listesi hatası:', err);
    res.status(500).json({ message: 'Column bilgileri alınamadı.' });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (e) { console.error('Connection close error:', e); }
    }
  }
});

// [POST] /api/sources/preview - Seçilen kolonlardan örnek veri al
app.post('/api/sources/preview', requireAuth, async (req, res) => {
  const { details, type, schema, table, columns } = req.body;
  
  console.log('🔍 Preview endpoint called:', { type, schema, table, columns: columns?.length });
  
  if (!details || !schema || !table || !columns || columns.length === 0) {
    return res.status(400).json({ message: 'Details, schema, table ve columns gereklidir.' });
  }

  let connection;
  try {
    if (type === "HANA") {
      connection = await new hana.createConnection({
        serverNode: `${details.host}:${details.port || '443'}`,
        uid: details.user || details.username,
        pwd: details.password,
        encrypt: true,
        sslValidateCertificate: false,
        connectTimeout: 30000,
        sslHostNameInCertificate: '*'
      }).connect();
      
      const columnList = columns.join(', ');
      const query = `SELECT TOP 20 ${columnList} FROM "${schema}"."${table}"`;
      console.log('🔍 HANA Preview query:', query);
      
      const result = await connection.exec(query);
      res.json({ data: result, rowCount: result.length });
      
    } else if (type === "MSSQL") {
      connection = await new sql.ConnectionPool({
        user: details.user || details.username || details.User || details.Username,
        password: details.password,
        server: details.host,
        database: details.database,
        options: { encrypt: true, trustServerCertificate: true }
      }).connect();
      
      const columnList = columns.join(', ');
      const query = `SELECT TOP 20 ${columnList} FROM [${schema}].[${table}]`;
      console.log('🔍 MSSQL Preview query:', query);
      
      const result = await connection.request().query(query);
      res.json({ data: result.recordset, rowCount: result.recordset.length });
    }
  } catch (err) {
    console.error('❌ Preview hatası:', err.message || err);
    res.status(500).json({ message: `Veri önizlemesi alınamadı: ${err.message}` });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (e) { console.error('Connection close error:', e); }
    }
  }
});

// --- DESTINATION İÇİN AYNI ENDPOINT'LER (schema/table/column) ---

// [POST] /api/destination/schemas - Test connection ile aynı config  
app.post('/api/destination/schemas', requireAuth, async (req, res) => {
  const { details, type } = req.body;
  
  console.log('🔍 Destination schema endpoint called:', { type, details: details ? 'EXISTS' : 'NULL' });
  
  if (!details) {
    console.error('❌ Details missing from request body');
    return res.status(400).json({ message: 'Details alanı gereklidir.' });
  }

  let connection;
  try {
    if (type === "HANA") {
      connection = await new hana.createConnection({
        serverNode: `${details.host}:${details.port || '443'}`,
        uid: details.user || details.username,
        pwd: details.password,
        encrypt: true,
        sslValidateCertificate: false,
        connectTimeout: 30000,
        sslHostNameInCertificate: '*'
      }).connect();
      
      const result = await connection.exec("SELECT SCHEMA_NAME FROM SCHEMAS WHERE HAS_PRIVILEGES='TRUE' ORDER BY SCHEMA_NAME");
      const schemas = result.map(row => row.SCHEMA_NAME);
      res.json({ schemas });
      
    } else if (type === "MSSQL") {
      connection = await new sql.ConnectionPool({
        user: details.user || details.username || details.User || details.Username,
        password: details.password,
        server: details.host,
        database: details.database,
        options: { encrypt: true, trustServerCertificate: true }
      }).connect();
      
      const result = await connection.request().query("SELECT name as schema_name FROM sys.schemas WHERE name NOT IN ('sys', 'INFORMATION_SCHEMA') ORDER BY name");
      const schemas = result.recordset.map(row => row.schema_name);
      res.json({ schemas });
    }
  } catch (err) {
    console.error('❌ Destination schema listesi hatası:', err.message || err);
    res.status(500).json({ message: `Schema bilgileri alınamadı: ${err.message}` });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (e) { console.error('Connection close error:', e); }
    }
  }
});

// [POST] /api/destination/tables
app.post('/api/destination/tables', requireAuth, async (req, res) => {
  const { details, type, schema } = req.body;
  
  if (!details || !schema) return res.status(400).json({ message: 'Details ve schema gereklidir.' });

  let connection;
  try {
    if (type === "HANA") {
      connection = await new hana.createConnection({
        serverNode: `${details.host}:${details.port || '443'}`,
        uid: details.user || details.username,
        pwd: details.password,
        encrypt: true,
        sslValidateCertificate: false,
        connectTimeout: 30000,
        sslHostNameInCertificate: '*'
      }).connect();
      
      const result = await connection.exec(`SELECT TABLE_NAME FROM TABLES WHERE SCHEMA_NAME = '${schema}' ORDER BY TABLE_NAME`);
      const tables = result.map(row => row.TABLE_NAME);
      res.json({ tables });
      
    } else if (type === "MSSQL") {
      connection = await new sql.ConnectionPool({
        user: details.user || details.username || details.User || details.Username,
        password: details.password,
        server: details.host,
        database: details.database,
        options: { encrypt: true, trustServerCertificate: true }
      }).connect();
      
      const result = await connection.request().query(`SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = '${schema}' AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME`);
      const tables = result.recordset.map(row => row.TABLE_NAME);
      res.json({ tables });
    }
  } catch (err) {
    console.error('Destination table listesi hatası:', err);
    res.status(500).json({ message: 'Table bilgileri alınamadı.' });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (e) { console.error('Connection close error:', e); }
    }
  }
});

// [POST] /api/destination/columns
app.post('/api/destination/columns', requireAuth, async (req, res) => {
  const { details, type, schema, table } = req.body;
  
  if (!details || !schema || !table) return res.status(400).json({ message: 'Details, schema ve table gereklidir.' });

  let connection;
  try {
    if (type === "HANA") {
      connection = await new hana.createConnection({
        serverNode: `${details.host}:${details.port || '443'}`,
        uid: details.user || details.username,
        pwd: details.password,
        encrypt: true,
        sslValidateCertificate: false,
        connectTimeout: 30000,
        sslHostNameInCertificate: '*'
      }).connect();
      
      const result = await connection.exec(`SELECT COLUMN_NAME, DATA_TYPE_NAME, LENGTH, IS_NULLABLE FROM COLUMNS WHERE SCHEMA_NAME = '${schema}' AND TABLE_NAME = '${table}' ORDER BY POSITION`);
      const columns = result.map(row => ({
        name: row.COLUMN_NAME,
        type: row.DATA_TYPE_NAME,
        length: row.LENGTH,
        nullable: row.IS_NULLABLE === 'TRUE'
      }));
      res.json({ columns });
      
    } else if (type === "MSSQL") {
      connection = await new sql.ConnectionPool({
        user: details.user || details.username || details.User || details.Username,
        password: details.password,
        server: details.host,
        database: details.database,
        options: { encrypt: true, trustServerCertificate: true }
      }).connect();
      
      const result = await connection.request().query(`
        SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = '${schema}' AND TABLE_NAME = '${table}' 
        ORDER BY ORDINAL_POSITION
      `);
      const columns = result.recordset.map(row => ({
        name: row.COLUMN_NAME,
        type: row.DATA_TYPE,
        length: row.CHARACTER_MAXIMUM_LENGTH,
        nullable: row.IS_NULLABLE === 'YES'
      }));
      res.json({ columns });
    }
  } catch (err) {
    console.error('Destination column listesi hatası:', err);
    res.status(500).json({ message: 'Column bilgileri alınamadı.' });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (e) { console.error('Connection close error:', e); }
    }
  }
});

//popup sources details getirme












// --- DESTINATION ENDPOINTS (DÜZELTİLMİŞ & YORUMLU) ---

// NOT: Bu kod örneğinde `poolPromise` ve `sql` (mssql) zaten tanımlı olmalıdır.
// Ayrıca requireAuth middleware'inin req.user.id verdiğini varsayıyorum.

/**
 * GET /api/destination
 * Kullanıcının kayıtlı destination'larını listeler
 */
app.get('/api/destination', requireAuth, async (req, res) => {
  const userId = req.user.id;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .query('SELECT ID, TYPE, NAME FROM [mosuser].[DESTINATION] WHERE USER_ID = @userId ORDER BY ID DESC');
    // result.recordset içerir: [{ ID, TYPE, NAME }, ...]
    res.status(200).json(result.recordset);
  } catch (err) {
    // Ayrıntılı log: hata mesajı + obje
    console.error('Destination listesi getirme hatası:', err && err.message ? err.message : err, err);
    res.status(500).json({ message: 'Destination listesi getirilemedi.' });
  }
});

/**
 * POST /api/destination
 * Yeni destination oluşturur
 */
app.post('/api/destination', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { name, type, details } = req.body;

  // Basit validasyon
  if (!name || !type || !details) {
    return res.status(400).json({ message: 'Name, type ve details alanları gereklidir.' });
  }

  // tip kontrolü (mesajı da güncelledim)
  if (!['HANA', 'SAP', 'MSSQL'].includes(type)) {
    return res.status(400).json({ message: 'Type sadece HANA, SAP veya MSSQL olabilir.' });
  }

  try {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);

    await transaction.begin();

    try {
      // 1) DESTINATION tablosuna ekle ve inserted ID al
      const destinationResult = await transaction.request()
        .input('userId', sql.Int, userId)
        .input('name', sql.NVarChar(255), name)
        .input('type', sql.NVarChar(50), type)
        .query(`
          INSERT INTO [mosuser].[DESTINATION] (USER_ID, NAME, TYPE)
          OUTPUT INSERTED.ID
          VALUES (@userId, @name, @type)
        `);

      const destinationId = destinationResult.recordset[0].ID;

      // 2) details objesindeki satırları DESTINATION_INFO tablosuna ekle
      for (const [property, value] of Object.entries(details)) {
        if (!value) continue;              // boşsa atla

        await transaction.request()
          .input('destinationId', sql.Int, destinationId)
          .input('property', sql.NVarChar(100), property)
          .input('value', sql.NVarChar(2000), String(value))
          .query(`
            INSERT INTO [mosuser].[DESTINATION_INFO] (DESTINATION_ID, PROPERTY, VALUE)
            VALUES (@destinationId, @property, @value)
          `);
      }

      await transaction.commit();

      // DÖNÜŞ: destinationId açıkça döndür
      res.status(201).json({ message: 'Destination başarıyla kaydedildi.', destinationId });

    } catch (err) {
      await transaction.rollback();
      // İç hata: ayrıntıyı logla ve üstteki catch'e at
      console.error('Transaction içinde hata (insert destination):', err && err.message ? err.message : err, err);
      throw err;
    }
  } catch (err) {
    console.error('Destination kaydetme hatası:', err && err.message ? err.message : err, err);
    res.status(500).json({ message: 'Destination kaydedilirken bir hata oluştu.' });
  }
});

/**
 * GET /api/destination/:id
 * Belirli bir destination'un detaylarını getirir (details dahil)
 */
app.get('/api/destination/:id', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const destinationId = Number(req.params.id);

  if (!destinationId) {
    return res.status(400).json({ message: 'Geçersiz destination id.' });
  }

  try {
    const pool = await poolPromise;

    // 1) Destination'un kullanıcıya ait olup olmadığını kontrol et (parametre isimleri doğru olmalı)
    const sourceResult = await pool.request()
      .input('userId', sql.Int, userId)
      .input('destinationId', sql.Int, destinationId) // parametre adıyla placeholder aynı olmalı
      .query('SELECT ID, TYPE, NAME FROM [mosuser].[DESTINATION] WHERE ID = @destinationId AND USER_ID = @userId');

    if (!sourceResult.recordset || sourceResult.recordset.length === 0) {
      return res.status(404).json({ message: 'Destination bulunamadı veya erişim yetkiniz yok.' });
    }

    const destination = sourceResult.recordset[0];

    // 2) Details'leri getir
    const detailsResult = await pool.request()
      .input('destinationId', sql.Int, destinationId)
      .query('SELECT PROPERTY, VALUE FROM [mosuser].[DESTINATION_INFO] WHERE DESTINATION_ID = @destinationId');

    // 3) Details'leri obje formatına çevir
    const details = {};
    detailsResult.recordset.forEach(row => {
      details[row.PROPERTY] = row.VALUE;
    });

    // 4) Dönüş formatı
    res.status(200).json({
      id: destination.ID,
      name: destination.NAME,
      type: destination.TYPE,
      details: details
    });

  } catch (err) {
    console.error('Destination detayları getirme hatası:', err && err.message ? err.message : err, err);
    res.status(500).json({ message: 'Destination detayları getirilemedi.' });
  }
});

/**
 * PUT /api/destination/:id
 * (Opsiyonel ama frontend PUT gönderiyor; burada update implementasyonu)
 * Destination ve details güncellemesi yapar.
 */
app.put('/api/destination/:id', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const destinationId = Number(req.params.id);
  const { name, type, details } = req.body;

  if (!destinationId) return res.status(400).json({ message: 'Geçersiz id.' });
  if (!name || !type || !details) return res.status(400).json({ message: 'Name, type ve details gerekli.' });

  try {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // 1) Ownership kontrolü
      const ownership = await transaction.request()
        .input('destinationId', sql.Int, destinationId)
        .input('userId', sql.Int, userId)
        .query('SELECT ID FROM [mosuser].[DESTINATION] WHERE ID = @destinationId AND USER_ID = @userId');

      if (!ownership.recordset || ownership.recordset.length === 0) {
        await transaction.rollback();
        return res.status(403).json({ message: 'Bu kaynağı güncelleme yetkiniz yok.' });
      }

      // 2) Destination güncelle
      await transaction.request()
        .input('destinationId', sql.Int, destinationId)
        .input('name', sql.NVarChar(255), name)
        .input('type', sql.NVarChar(50), type)
        .query('UPDATE [mosuser].[DESTINATION] SET NAME = @name, TYPE = @type WHERE ID = @destinationId');

      // 3) Details: basit strateji => önce eski detayları sil, sonra yeniden ekle (alternatif: upsert)
      await transaction.request()
        .input('destinationId', sql.Int, destinationId)
        .query('DELETE FROM [mosuser].[DESTINATION_INFO] WHERE DESTINATION_ID = @destinationId');

      for (const [property, value] of Object.entries(details)) {
        if (!value) continue;

        await transaction.request()
          .input('destinationId', sql.Int, destinationId)
          .input('property', sql.NVarChar(100), property)
          .input('value', sql.NVarChar(2000), String(value))
          .query('INSERT INTO [mosuser].[DESTINATION_INFO] (DESTINATION_ID, PROPERTY, VALUE) VALUES (@destinationId, @property, @value)');
      }

      await transaction.commit();
      res.status(200).json({ message: 'Destination başarıyla güncellendi.' });

    } catch (err) {
      await transaction.rollback();
      console.error('Destination update transaction hatası:', err && err.message ? err.message : err, err);
      throw err;
    }

  } catch (err) {
    console.error('Destination güncelleme hatası:', err && err.message ? err.message : err, err);
    res.status(500).json({ message: 'Destination güncellenirken hata oluştu.' });
  }
});

/**
 * DELETE /api/destination/:id
 * Destination siler (ve bağlı details'leri)
 */
app.delete('/api/destination/:id', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const destinationId = Number(req.params.id);

  if (!destinationId) return res.status(400).json({ message: 'Geçersiz id.' });

  try {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Ownership kontrolü
      const ownership = await transaction.request()
        .input('destinationId', sql.Int, destinationId)
        .input('userId', sql.Int, userId)
        .query('SELECT ID FROM [mosuser].[DESTINATION] WHERE ID = @destinationId AND USER_ID = @userId');

      if (!ownership.recordset || ownership.recordset.length === 0) {
        await transaction.rollback();
        return res.status(403).json({ message: 'Bu kaynağı silme yetkiniz yok.' });
      }

      // önce details sil
      await transaction.request()
        .input('destinationId', sql.Int, destinationId)
        .query('DELETE FROM [mosuser].[DESTINATION_INFO] WHERE DESTINATION_ID = @destinationId');

      // sonra destination sil
      await transaction.request()
        .input('destinationId', sql.Int, destinationId)
        .query('DELETE FROM [mosuser].[DESTINATION] WHERE ID = @destinationId');

      await transaction.commit();
      res.status(204).send(); // success, no content

    } catch (err) {
      await transaction.rollback();
      console.error('Destination delete transaction hatası:', err && err.message ? err.message : err, err);
      throw err;
    }

  } catch (err) {
    console.error('Destination silme hatası:', err && err.message ? err.message : err, err);
    res.status(500).json({ message: 'Destination silinirken hata oluştu.' });
  }
});

// --- ŞABLON ÇALIŞTIRMA (YENİ ENDPOINT) ---
app.post('/api/templates/:id/execute', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const templateId = req.params.id;

  let sourceConnection;
  let destConnection;

  try {
    const pool = await poolPromise;
    const templateResult = await pool.request()
      .input('userId', sql.Int, userId)
      .input('templateId', sql.Int, templateId)
      .query('SELECT JSON FROM [mosuser].[TEMPLATES] WHERE ID = @templateId AND USER_ID = @userId');

    if (templateResult.recordset.length === 0) {
      return res.status(404).json({ message: 'Şablon bulunamadı veya bu şablonu çalıştırma yetkiniz yok.' });
    }

    const flowData = JSON.parse(templateResult.recordset[0].JSON);
    const destNode = flowData.nodes.find(n => n.type === 'tableDestination');

    if (!destNode || !destNode.data.transferConfig || !destNode.data.columnMappings) {
      return res.status(400).json({ message: 'Akış JSON verisinde transfer yapılandırması veya kolon eşleşmesi eksik.' });
    }

    const { sourceConnection: sourceDetails, sourceTable, destinationConnection: destDetails, destinationTable: destTable } = destNode.data.transferConfig;
    const columnMappings = destNode.data.columnMappings;
    const sourceColumns = Object.keys(columnMappings);

    // --- 1. Connect to SOURCE and fetch data ---
    const sourceConfig = {
        user: sourceDetails.username,
        password: sourceDetails.password,
        server: sourceDetails.host, // FIX: Map host to server
        database: sourceDetails.database,
        options: { encrypt: true, trustServerCertificate: true },
    };
    sourceConnection = await new sql.ConnectionPool(sourceConfig).connect();
    const selectQuery = `SELECT ${sourceColumns.join(', ')} FROM ${sourceTable}`;
    const sourceDataResult = await sourceConnection.request().query(selectQuery);
    await sourceConnection.close();

    if (sourceDataResult.recordset.length === 0) {
      return res.status(200).json({ message: 'Kaynak tabloda veri bulunamadı. 0 satır aktarıldı.' });
    }

    // --- 2. Connect to DESTINATION, get schema, and perform bulk insert ---
    const destConfig = {
        user: destDetails.username,
        password: destDetails.password,
        server: destDetails.host, // FIX: Map host to server
        database: destDetails.database,
        options: { encrypt: true, trustServerCertificate: true },
    };
    destConnection = await new sql.ConnectionPool(destConfig).connect();

    // --- Get destination table schema ---
    const [destSchema, destTableName] = destTable.split('.');
    const schemaQuery = `
      SELECT COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = @table
    `;
    const destSchemaResult = await destConnection.request()
      .input('schema', sql.NVarChar, destSchema)
      .input('table', sql.NVarChar, destTableName)
      .query(schemaQuery);

    if (destSchemaResult.recordset.length === 0) {
      throw new Error(`Hedef tablo '${destTable}' bulunamadı veya şeması okunamadı.`);
    }

    const destTypeMap = {};
    destSchemaResult.recordset.forEach(row => {
      destTypeMap[row.COLUMN_NAME] = row.DATA_TYPE;
    });

    const getSqlType = (sqlType) => {
      const type = sqlType.toLowerCase();
      if (type.includes('char')) return sql.NVarChar;
      if (type.includes('int')) return sql.Int;
      if (type.includes('decimal') || type.includes('numeric')) return sql.Decimal;
      if (type.includes('float') || type.includes('real')) return sql.Float;
      if (type.includes('date') || type.includes('time')) return sql.DateTime;
      if (type.includes('bit')) return sql.Bit;
      return sql.NVarChar; // Default
    };

    const table = new sql.Table(destTable);
    table.create = false;

    const destColumns = Object.values(columnMappings);
    destColumns.forEach(colName => {
      const dbType = destTypeMap[colName];
      if (!dbType) throw new Error(`Hedef tabloda '${colName}' kolonu bulunamadı.`);
      table.columns.add(colName, getSqlType(dbType));
    });

    sourceDataResult.recordset.forEach(sourceRow => {
      const newRow = [];
      destColumns.forEach((destColName, index) => {
        const sourceCol = Object.keys(columnMappings).find(key => columnMappings[key] === destColName);
        const value = sourceRow[sourceCol];
        const destType = destTypeMap[destColName].toLowerCase();

        if (value === null || value === undefined) {
            newRow[index] = null; // Pass nulls through
        } else if (destType.includes('int')) {
            const num = parseInt(value, 10);
            newRow[index] = isNaN(num) ? null : num; // If parsing fails, insert NULL.
        } else {
            // For any other destination type (NVarChar, DateTime, etc.), ensure the value is a string.
            newRow[index] = String(value);
        }
      });
      table.rows.add(...newRow);
    });

    const request = new sql.Request(destConnection);
    const bulkResult = await request.bulk(table);
    await destConnection.close();

    res.status(200).json({ 
      message: `Akış başarıyla çalıştırıldı. ${bulkResult.rowsAffected} satır hedefe aktarıldı.`
    });

  } catch (err) {
    console.error(`Template ${templateId} çalıştırılırken hata:`, err);
    res.status(500).json({ message: 'Akış çalıştırılırken bir sunucu hatası oluştu: ' + err.message });
  } finally {
    if (sourceConnection && sourceConnection.connected) await sourceConnection.close();
    if (destConnection && destConnection.connected) await destConnection.close();
  }
});

// --- Sunucuyu Dinlemeye Başla ---
app.listen(PORT, () => {
  console.log(`🚀 Backend sunucusu http://localhost:${PORT} adresinde çalışıyor`);
});