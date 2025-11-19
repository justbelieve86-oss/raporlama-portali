DROP VIEW IF EXISTS public.user_unit_assignments;
CREATE OR REPLACE VIEW public.user_unit_assignments
WITH (security_invoker = true)
AS
SELECT
    u.id as user_id,
    ub.brand_id,
    b.name as brand_name
FROM
    auth.users u
JOIN
    public.user_brands ub ON u.id = ub.user_id
JOIN
    public.brands b ON ub.brand_id = b.id;

DROP VIEW IF EXISTS public.unit_kpi_assignments;
CREATE OR REPLACE VIEW public.unit_kpi_assignments
WITH (security_invoker = true)
AS
SELECT
    k.id as kpi_id,
    k.name as kpi_name,
    ku.id as unit_id,
    ku.name as unit_name
FROM
    public.kpis k
JOIN
    public.kpi_units ku ON k.unit = ku.name;