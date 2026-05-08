
CREATE OR REPLACE FUNCTION public.ensure_customer_for_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_cvr text;
  v_existing_id uuid;
  v_is_business boolean;
BEGIN
  IF NEW.business_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_email := lower(trim(coalesce(NEW.customer_email, '')));
  IF v_email = '' THEN
    RETURN NEW;
  END IF;

  v_cvr := regexp_replace(coalesce(NEW.cvr, ''), '\D', '', 'g');
  v_is_business := length(v_cvr) >= 6 OR coalesce(NEW.company_name, '') <> '';

  IF v_is_business THEN
    SELECT id INTO v_existing_id
    FROM public.business_customers
    WHERE business_id = NEW.business_id
      AND (lower(email) = v_email OR (v_cvr <> '' AND regexp_replace(coalesce(cvr,''), '\D', '', 'g') = v_cvr))
    LIMIT 1;

    IF v_existing_id IS NULL THEN
      INSERT INTO public.business_customers (
        business_id, company_name, contact_name, email, phone,
        cvr, address, zip_code, city, latitude, longitude
      ) VALUES (
        NEW.business_id,
        coalesce(NEW.company_name, NEW.customer_name, 'Ukendt virksomhed'),
        NEW.customer_name,
        NEW.customer_email,
        NEW.customer_phone,
        nullif(v_cvr, ''),
        NEW.address, NEW.zip_code, NEW.city,
        NEW.latitude, NEW.longitude
      );
    END IF;
  ELSE
    SELECT id INTO v_existing_id
    FROM public.private_customers
    WHERE business_id = NEW.business_id AND lower(email) = v_email
    LIMIT 1;

    IF v_existing_id IS NULL THEN
      INSERT INTO public.private_customers (
        business_id, name, email, phone,
        address, zip_code, city, latitude, longitude
      ) VALUES (
        NEW.business_id,
        coalesce(NEW.customer_name, 'Ukendt'),
        NEW.customer_email,
        NEW.customer_phone,
        NEW.address, NEW.zip_code, NEW.city,
        NEW.latitude, NEW.longitude
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_customer_for_order ON public.orders;
CREATE TRIGGER trg_ensure_customer_for_order
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.ensure_customer_for_order();

-- Backfill missing customer records for existing orders
DO $$
DECLARE
  r record;
  v_email text;
  v_cvr text;
  v_existing_id uuid;
  v_is_business boolean;
BEGIN
  FOR r IN
    SELECT DISTINCT ON (o.business_id, lower(o.customer_email))
      o.business_id, o.customer_name, o.customer_email, o.customer_phone,
      o.cvr, o.company_name, o.address, o.zip_code, o.city, o.latitude, o.longitude
    FROM public.orders o
    WHERE o.business_id IS NOT NULL
      AND coalesce(o.customer_email, '') <> ''
  LOOP
    v_email := lower(trim(r.customer_email));
    v_cvr := regexp_replace(coalesce(r.cvr, ''), '\D', '', 'g');
    v_is_business := length(v_cvr) >= 6 OR coalesce(r.company_name, '') <> '';

    IF v_is_business THEN
      SELECT id INTO v_existing_id
      FROM public.business_customers
      WHERE business_id = r.business_id
        AND (lower(email) = v_email OR (v_cvr <> '' AND regexp_replace(coalesce(cvr,''), '\D', '', 'g') = v_cvr))
      LIMIT 1;

      IF v_existing_id IS NULL THEN
        INSERT INTO public.business_customers (
          business_id, company_name, contact_name, email, phone,
          cvr, address, zip_code, city, latitude, longitude
        ) VALUES (
          r.business_id,
          coalesce(r.company_name, r.customer_name, 'Ukendt virksomhed'),
          r.customer_name, r.customer_email, r.customer_phone,
          nullif(v_cvr, ''),
          r.address, r.zip_code, r.city, r.latitude, r.longitude
        );
      END IF;
    ELSE
      SELECT id INTO v_existing_id
      FROM public.private_customers
      WHERE business_id = r.business_id AND lower(email) = v_email
      LIMIT 1;

      IF v_existing_id IS NULL THEN
        INSERT INTO public.private_customers (
          business_id, name, email, phone,
          address, zip_code, city, latitude, longitude
        ) VALUES (
          r.business_id,
          coalesce(r.customer_name, 'Ukendt'),
          r.customer_email, r.customer_phone,
          r.address, r.zip_code, r.city, r.latitude, r.longitude
        );
      END IF;
    END IF;
  END LOOP;
END $$;
