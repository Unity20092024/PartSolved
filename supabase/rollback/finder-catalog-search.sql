-- Read-only function only; drop this before rolling back the catalog foundation.
begin;
drop function public.catalog_find(text,text,text[],text[],jsonb,integer,integer);
commit;
