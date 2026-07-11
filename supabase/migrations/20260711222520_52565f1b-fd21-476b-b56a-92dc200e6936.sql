
REVOKE EXECUTE ON FUNCTION public.has_org_role(UUID, UUID, public.app_role[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_org_member(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.grant_owner_role() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_touch_updated_at() FROM PUBLIC, anon, authenticated;
