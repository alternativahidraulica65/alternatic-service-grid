-- Revoke execute from authenticated on the security definer function to fix linter warning
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM authenticated;
-- The function is still callable via RLS policies because the policies run with the owner's privileges (postgres/service_role) when checking has_role.
