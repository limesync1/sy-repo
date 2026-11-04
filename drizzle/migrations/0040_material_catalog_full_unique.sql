UPDATE public.material_catalog SET sku = 'navn:' || lower(name) WHERE sku = '';
DROP INDEX IF EXISTS public.material_catalog_sku_uq;
CREATE UNIQUE INDEX material_catalog_sku_uq ON public.material_catalog(business_id, supplier, sku);