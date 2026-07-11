
-- Enums
CREATE TYPE public.app_role AS ENUM ('owner','admin','moderator','cashier','participant');
CREATE TYPE public.submission_status AS ENUM ('pending','approved','rejected','hidden');
CREATE TYPE public.submission_kind AS ENUM ('donation','prayer','thanksgiving','support');
CREATE TYPE public.payment_method AS ENUM ('cash','mobile_money','card','bank_transfer','other');

-- Organizations
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  address TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  primary_color TEXT DEFAULT '#8B6F3E',
  accent_color TEXT DEFAULT '#C9A961',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.organizations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- User roles (per-org)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, organization_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer to avoid recursive RLS
CREATE OR REPLACE FUNCTION public.has_org_role(_user_id UUID, _org_id UUID, _roles public.app_role[])
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND organization_id = _org_id AND role = ANY(_roles)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND organization_id = _org_id);
$$;

-- Events
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  banner_url TEXT,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  fundraising_goal NUMERIC(14,2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  projection_theme TEXT DEFAULT 'warm',
  is_live BOOLEAN NOT NULL DEFAULT true,
  auto_approve BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX events_org_idx ON public.events(organization_id);
GRANT SELECT ON public.events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Submissions
CREATE TABLE public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  kind public.submission_kind NOT NULL DEFAULT 'donation',
  status public.submission_status NOT NULL DEFAULT 'pending',
  full_name TEXT,
  group_name TEXT,
  phone TEXT,
  email TEXT,
  amount NUMERIC(14,2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  payment_method public.payment_method,
  message TEXT,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX submissions_event_idx ON public.submissions(event_id, status, created_at DESC);
GRANT SELECT, INSERT ON public.submissions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.submissions TO authenticated;
GRANT ALL ON public.submissions TO service_role;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- ORG policies
CREATE POLICY "Anyone can view organizations" ON public.organizations FOR SELECT USING (true);
CREATE POLICY "Authenticated can create org" ON public.organizations FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners/admins can update org" ON public.organizations FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id OR public.has_org_role(auth.uid(), id, ARRAY['owner','admin']::public.app_role[]));
CREATE POLICY "Owner can delete org" ON public.organizations FOR DELETE TO authenticated USING (auth.uid() = owner_id);

-- USER ROLES policies
CREATE POLICY "Members see their org roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_org_role(auth.uid(), organization_id, ARRAY['owner','admin']::public.app_role[]));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_org_role(auth.uid(), organization_id, ARRAY['owner','admin']::public.app_role[]))
  WITH CHECK (public.has_org_role(auth.uid(), organization_id, ARRAY['owner','admin']::public.app_role[]));

-- EVENTS policies
CREATE POLICY "Anyone can view events" ON public.events FOR SELECT USING (true);
CREATE POLICY "Org members can create events" ON public.events FOR INSERT TO authenticated
  WITH CHECK (public.has_org_role(auth.uid(), organization_id, ARRAY['owner','admin']::public.app_role[]));
CREATE POLICY "Org admins can update events" ON public.events FOR UPDATE TO authenticated
  USING (public.has_org_role(auth.uid(), organization_id, ARRAY['owner','admin']::public.app_role[]));
CREATE POLICY "Org admins can delete events" ON public.events FOR DELETE TO authenticated
  USING (public.has_org_role(auth.uid(), organization_id, ARRAY['owner','admin']::public.app_role[]));

-- SUBMISSIONS policies
CREATE POLICY "Public sees approved submissions" ON public.submissions FOR SELECT USING (status = 'approved');
CREATE POLICY "Org staff sees all submissions" ON public.submissions FOR SELECT TO authenticated
  USING (public.has_org_role(auth.uid(), organization_id, ARRAY['owner','admin','moderator','cashier']::public.app_role[]));
CREATE POLICY "Anyone can submit" ON public.submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Moderators can update submissions" ON public.submissions FOR UPDATE TO authenticated
  USING (public.has_org_role(auth.uid(), organization_id, ARRAY['owner','admin','moderator']::public.app_role[]));
CREATE POLICY "Admins can delete submissions" ON public.submissions FOR DELETE TO authenticated
  USING (public.has_org_role(auth.uid(), organization_id, ARRAY['owner','admin']::public.app_role[]));

-- Auto-grant owner role on org creation
CREATE OR REPLACE FUNCTION public.grant_owner_role()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, organization_id, role)
  VALUES (NEW.owner_id, NEW.id, 'owner')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_org_created AFTER INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.grant_owner_role();

-- updated_at
CREATE OR REPLACE FUNCTION public.tg_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER tg_orgs_touch BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
CREATE TRIGGER tg_events_touch BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.submissions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
