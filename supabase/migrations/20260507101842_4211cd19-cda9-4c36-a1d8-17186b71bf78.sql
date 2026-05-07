UPDATE public.platform_settings
SET base_price_dkk = 299,
    price_route_planning_dkk = 199,
    price_accounting_integration_dkk = 149,
    price_data_import_dkk = 1495,
    price_per_employee_login_dkk = 79,
    updated_at = now()
WHERE id = 1;