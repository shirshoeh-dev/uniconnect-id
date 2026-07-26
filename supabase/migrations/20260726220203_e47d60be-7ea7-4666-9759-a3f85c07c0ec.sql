
CREATE TYPE public.app_role AS ENUM ('admin', 'student');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE SEQUENCE public.digital_id_seq START 1001;

CREATE OR REPLACE FUNCTION public.next_digital_id()
RETURNS text LANGUAGE sql VOLATILE SET search_path = public AS $$
  SELECT 'UNIDEL-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.digital_id_seq')::text, 5, '0');
$$;

CREATE TABLE public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  digital_id text NOT NULL UNIQUE DEFAULT public.next_digital_id(),
  matric_number text NOT NULL UNIQUE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  faculty text NOT NULL,
  department text NOT NULL,
  level text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "students read own record" ON public.students FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admins read all students" ON public.students FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins insert students" ON public.students FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update students" ON public.students FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins delete students" ON public.students FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER students_touch BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.login_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES public.students(id) ON DELETE CASCADE,
  user_id uuid,
  login_time timestamptz NOT NULL DEFAULT now(),
  logout_time timestamptz,
  browser text,
  ip_address text
);
GRANT SELECT, INSERT, UPDATE ON public.login_logs TO authenticated;
GRANT ALL ON public.login_logs TO service_role;
ALTER TABLE public.login_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own logs" ON public.login_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users insert own logs" ON public.login_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own logs" ON public.login_logs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admins read all logs" ON public.login_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Public credential verification: exposes only non-sensitive fields
CREATE OR REPLACE FUNCTION public.verify_credential(_digital_id text)
RETURNS TABLE (full_name text, matric_number text, digital_id text, faculty text, department text, level text, status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.first_name || ' ' || s.last_name, s.matric_number, s.digital_id, s.faculty, s.department, s.level,
         CASE WHEN s.is_active THEN 'Valid' ELSE 'Revoked' END
  FROM public.students s
  WHERE upper(s.digital_id) = upper(trim(_digital_id));
$$;
GRANT EXECUTE ON FUNCTION public.verify_credential(text) TO anon, authenticated;

INSERT INTO public.students (matric_number, first_name, last_name, faculty, department, level, email, phone) VALUES
  ('UND/CSC/21/001', 'Chidi',    'Okonkwo',  'Faculty of Computing',        'Computer Science',       '400', 'chidi.okonkwo@student.unidel.edu.ng',  '08031234501'),
  ('UND/CSC/22/014', 'Ada',      'Nwachukwu','Faculty of Computing',        'Cyber Security',         '300', 'ada.nwachukwu@student.unidel.edu.ng',  '08031234502'),
  ('UND/LAW/20/007', 'Tega',     'Ovie',     'Faculty of Law',              'Private Law',            '500', 'tega.ovie@student.unidel.edu.ng',      '08031234503'),
  ('UND/SCI/23/032', 'Blessing', 'Eze',      'Faculty of Science',          'Microbiology',           '200', 'blessing.eze@student.unidel.edu.ng',   '08031234504'),
  ('UND/MGT/21/056', 'Efe',      'Akpore',   'Faculty of Management Sci.',  'Business Administration','400', 'efe.akpore@student.unidel.edu.ng',     '08031234505');
