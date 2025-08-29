import express from 'express';
import cors from 'cors';
import sql from 'mssql';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import crypto from 'crypto'; // JWT yerine eklendi
import cookieParser from 'cookie-parser'; // Eklendi

// .env dosyasındaki değişkenleri yükle
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

// Sunucu başladığında veritabanı havuzunu oluştur
const poolPromise = new sql.ConnectionPool(dbConfig)
  .connect()
  .then(pool => {
    console.log('Successfully connected to the database.');
    return pool;
  })
  .catch(err => console.error('Database connection failed:', err));

// --- Express Sunucu Kurulumu ---
const app = express();
const PORT = 3001;

// Middleware'ler
app.use(cors({
  origin: 'http://localhost:3000', // React uygulamanızın adresi
  credentials: true // Tarayıcının çerez gönderebilmesi için gerekli
}));
app.use(express.json());
app.use(cookieParser()); // cookie-parser middleware'i eklendi

// --- API Endpoints ---

// [POST] /api/register - Yeni kullanıcı kaydı (Değişiklik yok)
app.post('/api/register', async (req, res) => {
  const { username, surname, mail, phone, address, password } = req.body;

  if (!username || !password || !surname || !mail) {
    return res.status(400).json({ message: 'Username, password, surname, and mail are required' });
  }

  try {
    const pool = await poolPromise;

    const userCheckResult = await pool.request()
      .input('username', sql.NVarChar, username)
      .query('SELECT COUNT(*) as count FROM [mosuser].[Users] WHERE [USERNAME] = @username');

    if (userCheckResult.recordset[0].count > 0) {
      return res.status(409).json({ message: 'Username already exists' });
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

    res.status(201).json({ message: 'User registered successfully' });

  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'An error occurred during registration' });
  }
});


// [POST] /api/login - JWT yerine veritabanı oturumu kullanacak şekilde güncellendi
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('user_name', sql.NVarChar, username)
      .query('SELECT [USER_ID], [PASSWORD] FROM [mosuser].[LOGIN_INFO] WHERE [USER_NAME] = @user_name');

    if (result.recordset.length === 0) {
      return res.status(401).json({ message: 'Geçersiz kullanıcı adı veya şifre' });
    }

    const user = result.recordset[0];
    const isPasswordMatch = await bcrypt.compare(password, user.PASSWORD);

    if (!isPasswordMatch) {
      return res.status(401).json({ message: 'Geçersiz kullanıcı adı veya şifre' });
    }

    // --- Veritabanı Oturumu Oluşturma ---
    const sessionID = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 saat geçerli

    await pool.request()
      .input('sessionID', sql.NVarChar, sessionID)
      .input('userID', sql.Int, user.USER_ID)
      .input('expiresAt', sql.DateTime, expiresAt)
      .query('INSERT INTO [mosuser].[Sessions] (SessionID, UserID, ExpiresAt) VALUES (@sessionID, @userID, @expiresAt)');

    // Oturum ID'sini güvenli bir çerez olarak tarayıcıya gönder
    res.cookie('session_id', sessionID, {
      httpOnly: true, // JavaScript'in çereze erişimini engeller (XSS koruması)
      secure: process.env.NODE_ENV === 'production', // Sadece HTTPS'te çalışır
      expires: expiresAt
    });

    res.status(200).json({ message: 'Login successful' });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'An error occurred during login' });
  }
});

// [POST] /api/logout - Yeni eklendi
app.post('/api/logout', async (req, res) => {
  const sessionID = req.cookies.session_id;
  if (sessionID) {
    try {
      const pool = await poolPromise;
      // Veritabanından oturumu sil
      await pool.request()
        .input('sessionID', sql.NVarChar, sessionID)
        .query('DELETE FROM [mosuser].[Sessions] WHERE SessionID = @sessionID');
    } catch (err) {
      console.error('Logout error:', err);
    }
  }

  // Tarayıcıdaki çerezi temizle
  res.clearCookie('session_id');
  res.status(200).json({ message: 'Logged out successfully' });
});


// Sunucuyu dinlemeye başla
app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
});