-- Mevcut tablonun yapısını detaylı şekilde çek
-- TABLO_ADI ve SCHEMA_ADI kısmını kendi tablonla değiştir

SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    NUMERIC_PRECISION,
    NUMERIC_SCALE,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    ORDINAL_POSITION
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'SCHEMA_ADI'   -- Buraya schema adını yaz (örn: 'dbo', 'mosuser')
  AND TABLE_NAME = 'TABLO_ADI'      -- Buraya tablo adını yaz
ORDER BY ORDINAL_POSITION;

-- Alternatif sorgu (daha detaylı)
SELECT 
    c.COLUMN_NAME,
    c.DATA_TYPE,
    CASE 
        WHEN c.DATA_TYPE IN ('varchar', 'nvarchar', 'char', 'nchar') 
        THEN c.DATA_TYPE + '(' + CAST(c.CHARACTER_MAXIMUM_LENGTH AS VARCHAR) + ')'
        WHEN c.DATA_TYPE IN ('decimal', 'numeric') 
        THEN c.DATA_TYPE + '(' + CAST(c.NUMERIC_PRECISION AS VARCHAR) + ',' + CAST(c.NUMERIC_SCALE AS VARCHAR) + ')'
        ELSE c.DATA_TYPE
    END AS FULL_DATA_TYPE,
    CASE WHEN c.IS_NULLABLE = 'YES' THEN 'NULL' ELSE 'NOT NULL' END AS NULLABLE,
    c.COLUMN_DEFAULT,
    c.ORDINAL_POSITION
FROM INFORMATION_SCHEMA.COLUMNS c
WHERE c.TABLE_SCHEMA = 'SCHEMA_ADI'   -- Buraya schema adını yaz
  AND c.TABLE_NAME = 'TABLO_ADI'      -- Buraya tablo adını yaz
ORDER BY c.ORDINAL_POSITION;
