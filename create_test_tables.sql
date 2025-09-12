-- Test tabloları oluştur ve veri ekle
-- BCP hatasını test etmek için

-- 1. Test tablolarını oluştur (aynı yapıda)
CREATE TABLE [mosuser].[DENEME1] (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    AD NVARCHAR(50) NOT NULL,
    SOYAD NVARCHAR(50) NOT NULL,
    YAS INT NULL,
    MAAS DECIMAL(10,2) NULL,
    TARIH DATETIME NULL,
    AKTIF BIT DEFAULT 1
);

CREATE TABLE [mosuser].[DENEME2] (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    AD NVARCHAR(50) NOT NULL,
    SOYAD NVARCHAR(50) NOT NULL,
    YAS INT NULL,
    MAAS DECIMAL(10,2) NULL,
    TARIH DATETIME NULL,
    AKTIF BIT DEFAULT 1
);

-- 2. DENEME1'e test verileri ekle
INSERT INTO [mosuser].[DENEME1] (AD, SOYAD, YAS, MAAS, TARIH, AKTIF) VALUES
('Ahmet', 'Yılmaz', 25, 5000.50, '2024-01-15', 1),
('Ayşe', 'Kara', 30, 6500.75, '2024-02-20', 1),
('Mehmet', 'Demir', 35, 7200.00, '2024-03-10', 0),
('Fatma', 'Özkan', 28, 5800.25, '2024-04-05', 1),
('Can', 'Çelik', 32, 6900.80, '2024-05-12', 1);

-- 3. Kontrol sorguları
SELECT 'DENEME1 Veri Sayısı' as TABLO, COUNT(*) as KAYIT_SAYISI FROM [mosuser].[DENEME1]
UNION ALL
SELECT 'DENEME2 Veri Sayısı' as TABLO, COUNT(*) as KAYIT_SAYISI FROM [mosuser].[DENEME2];

-- DENEME1'deki verileri göster
SELECT * FROM [mosuser].[DENEME1];

-- DENEME2'nin boş olduğunu göster  
SELECT * FROM [mosuser].[DENEME2];

-- 4. Tablo yapılarını kontrol et
SELECT 
    'DENEME1' as TABLO_ADI,
    c.COLUMN_NAME,
    CASE 
        WHEN c.DATA_TYPE IN ('varchar', 'nvarchar', 'char', 'nchar') 
        THEN c.DATA_TYPE + '(' + CAST(c.CHARACTER_MAXIMUM_LENGTH AS VARCHAR) + ')'
        WHEN c.DATA_TYPE IN ('decimal', 'numeric') 
        THEN c.DATA_TYPE + '(' + CAST(c.NUMERIC_PRECISION AS VARCHAR) + ',' + CAST(c.NUMERIC_SCALE AS VARCHAR) + ')'
        ELSE c.DATA_TYPE
    END AS FULL_DATA_TYPE,
    CASE WHEN c.IS_NULLABLE = 'YES' THEN 'NULL' ELSE 'NOT NULL' END AS NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS c
WHERE c.TABLE_SCHEMA = 'mosuser' AND c.TABLE_NAME = 'DENEME1'

UNION ALL

SELECT 
    'DENEME2' as TABLO_ADI,
    c.COLUMN_NAME,
    CASE 
        WHEN c.DATA_TYPE IN ('varchar', 'nvarchar', 'char', 'nchar') 
        THEN c.DATA_TYPE + '(' + CAST(c.CHARACTER_MAXIMUM_LENGTH AS VARCHAR) + ')'
        WHEN c.DATA_TYPE IN ('decimal', 'numeric') 
        THEN c.DATA_TYPE + '(' + CAST(c.NUMERIC_PRECISION AS VARCHAR) + ',' + CAST(c.NUMERIC_SCALE AS VARCHAR) + ')'
        ELSE c.DATA_TYPE
    END AS FULL_DATA_TYPE,
    CASE WHEN c.IS_NULLABLE = 'YES' THEN 'NULL' ELSE 'NOT NULL' END AS NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS c
WHERE c.TABLE_SCHEMA = 'mosuser' AND c.TABLE_NAME = 'DENEME2'
ORDER BY TABLO_ADI, c.ORDINAL_POSITION;
