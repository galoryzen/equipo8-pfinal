-- =============================================
-- Load cities from DANE CSV
-- =============================================
-- Runs after 01-init.sql and 02-seed.sql
-- dane.csv is mounted at /docker-entrypoint-initdb.d/dane.csv

CREATE TEMP TABLE dane_raw (
    codigo          VARCHAR,
    codigo_municipio VARCHAR,
    continente      VARCHAR,
    pais            VARCHAR,
    departamento    VARCHAR,
    municipio       VARCHAR
);

COPY dane_raw (codigo, codigo_municipio, continente, pais, departamento, municipio)
FROM '/docker-entrypoint-initdb.d/dane.csv'
WITH (FORMAT csv, HEADER true);

INSERT INTO catalog.city (dane_code, name, department, country, continent)
SELECT codigo, INITCAP(municipio), INITCAP(departamento), INITCAP(pais), INITCAP(continente)
FROM dane_raw;

DROP TABLE dane_raw;
