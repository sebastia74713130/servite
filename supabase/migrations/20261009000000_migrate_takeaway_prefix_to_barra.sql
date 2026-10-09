-- Migration: Update takeaway table_code prefix from MESA- to BARRA-
UPDATE public.tables
SET table_code = REGEXP_REPLACE(table_code, '^MESA-', 'BARRA-')
WHERE type = 'takeaway' AND table_code LIKE 'MESA-%';

