DROP TRIGGER IF EXISTS trg_routes_updated ON public.routes;
CREATE TRIGGER trg_routes_updated
BEFORE UPDATE ON public.routes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_route_stops_updated ON public.route_stops;
CREATE TRIGGER trg_route_stops_updated
BEFORE UPDATE ON public.route_stops
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS recalc_route_totals_trigger ON public.route_stops;
CREATE TRIGGER recalc_route_totals_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.route_stops
FOR EACH ROW
EXECUTE FUNCTION public.trg_recalc_route_totals();

DROP TRIGGER IF EXISTS trg_handle_route_stop_completion ON public.route_stops;
DROP TRIGGER IF EXISTS trg_route_stop_completion ON public.route_stops;
CREATE TRIGGER trg_handle_route_stop_completion
AFTER UPDATE ON public.route_stops
FOR EACH ROW
WHEN (NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed'))
EXECUTE FUNCTION public.handle_route_stop_completion();

DROP TRIGGER IF EXISTS trg_update_service_duration_estimate ON public.route_stops;
CREATE TRIGGER trg_update_service_duration_estimate
AFTER UPDATE ON public.route_stops
FOR EACH ROW
WHEN (NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed'))
EXECUTE FUNCTION public.update_service_duration_estimate();

DROP TRIGGER IF EXISTS trg_sync_lead_assignee_iud ON public.route_stop_assignees;
CREATE TRIGGER trg_sync_lead_assignee_iud
AFTER INSERT OR UPDATE OR DELETE ON public.route_stop_assignees
FOR EACH ROW
EXECUTE FUNCTION public.sync_stop_lead_assignee();

DROP TRIGGER IF EXISTS trg_stop_time_entries_updated_at ON public.stop_time_entries;
CREATE TRIGGER trg_stop_time_entries_updated_at
BEFORE UPDATE ON public.stop_time_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_workdays_updated_at ON public.employee_workdays;
CREATE TRIGGER trg_workdays_updated_at
BEFORE UPDATE ON public.employee_workdays
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();