// FLEXILINKY/server/server.js

import express from 'express';
import cors from 'cors';
import sql from 'mssql';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import crypto from 'crypto';
import cookieParser from 'cookie-parser';

dotenv.config();

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
  .then(pool => {
    console.log('✅ Veritabanına başarıyla bağlanıldı.');
    return pool;
  })
  .catch(err => console.error('❌ Veritabanı bağlantısı BAŞARISIZ:', err));

// --- Express Sunucu Kurulumu ---
const app = express();
const PORT = 3001;

// --- Middleware'ler ---
app.use(cors({
  origin: 'http://localhost:5174', // React uygulamanızın adresi (Vite default)
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// --- API Endpoints ---

// [POST] /api/register - Yeni kullanıcı kaydı
app.post('/api/register', async (req, res) => {
  const { username, surname, mail, phone, address, password } = req.body;

  if (!username || !password || !surname || !mail) {
    return res.status(400).json({ message: 'Kullanıcı adı, soyadı, mail ve şifre alanları zorunludur.' });
  }

  try {
    const pool = await poolPromise;

    const userCheckResult = await pool.request()
      .input('username', sql.NVarChar, username)
      .query('SELECT COUNT(*) as count FROM [mosuser].[Users] WHERE [USERNAME] = @username');

    if (userCheckResult.recordset[0].count > 0) {
      return res.status(409).json({ message: 'Bu kullanıcı adı zaten mevcut.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const insertUserResult = await pool.request()
      .input('username', sql.NVarChar, username)
      .input('surname', sql.NVarChar, surname)
      .input('mail', sql.NVarChar, mail)
      .input('phone', sql.NVarChar, phone)
      .input('address', sql.NVarChar, address)
      .query(`
        INSERT INTO [mosuser].[Users] ([USERNAME], [SURNAME], [MAIL], [PHONE], [ADRESS], [REC_DATE], [STATUS])
        OUTPUT INSERTED.ID
        VALUES (@username, @surname, @mail, @phone, @address, GETDATE(), 1)
      `);

    const newUserId = insertUserResult.recordset[0].ID;

    await pool.request()
      .input('user_id', sql.Int, newUserId)
      .input('user_name', sql.NVarChar, username)
      .input('password', sql.NVarChar, hashedPassword)
      .query(`
        INSERT INTO [mosuser].[LOGIN_INFO] ([USER_ID], [USER_NAME], [PASSWORD])
        VALUES (@user_id, @user_name, @password)
      `);

    res.status(201).json({ message: 'Kullanıcı başarıyla kaydedildi.' });

  } catch (err) {
    console.error('Kayıt hatası:', err);
    res.status(500).json({ message: 'Kayıt sırasında bir sunucu hatası oluştu.' });
  }
});

// [POST] /api/login - Kullanıcı girişi
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Kullanıcı adı ve şifre gereklidir.' });
  }

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('user_name', sql.NVarChar, username)
      .query('SELECT [USER_ID], [PASSWORD] FROM [mosuser].[LOGIN_INFO] WHERE [USER_NAME] = @user_name');

    if (result.recordset.length === 0) {
      return res.status(401).json({ message: 'Geçersiz kullanıcı adı veya şifre.' });
    }

    const user = result.recordset[0];
    const isPasswordMatch = await bcrypt.compare(password, user.PASSWORD);

    if (!isPasswordMatch) {
      return res.status(401).json({ message: 'Geçersiz kullanıcı adı veya şifre.' });
    }
    
    // Basit session ID oluştur
    const sessionID = crypto.randomBytes(32).toString('hex');
    
    res.cookie('session_id', sessionID, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 saat
    });

    res.status(200).json({ message: 'Giriş başarılı.' });

  } catch (err) {
    console.error('Giriş hatası:', err);
    res.status(500).json({ message: 'Giriş sırasında bir sunucu hatası oluştu.' });
  }
});

// Sunucuyu dinlemeye başla
app.listen(PORT, () => {
  console.log(`🚀 Backend sunucusu http://localhost:${PORT} adresinde çalışıyor`);
});