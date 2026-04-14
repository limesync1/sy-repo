
-- 1. Change businesses.category from text to text[] (categories)
ALTER TABLE public.businesses ADD COLUMN categories text[] DEFAULT '{}';
UPDATE public.businesses SET categories = CASE WHEN category IS NOT NULL THEN ARRAY[category] ELSE '{}' END;

-- 2. Create profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  display_name text,
  phone text,
  avatar_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Add interval_options to services
ALTER TABLE public.services ADD COLUMN interval_options text[] DEFAULT '{engangskøb}';

-- 4. Create subscriptions table
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  service_name text NOT NULL,
  interval text NOT NULL DEFAULT 'engangskøb',
  status text NOT NULL DEFAULT 'active',
  details jsonb DEFAULT '{}',
  total_price numeric NOT NULL DEFAULT 0,
  paused_at timestamp with time zone,
  cancelled_at timestamp with time zone,
  next_service_date timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own subscriptions" ON public.subscriptions
  FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Customers can update own subscriptions" ON public.subscriptions
  FOR UPDATE USING (auth.uid() = customer_id);

CREATE POLICY "Business owners can view their subscriptions" ON public.subscriptions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.businesses WHERE id = subscriptions.business_id AND owner_id = auth.uid())
  );

CREATE POLICY "Anyone can create subscriptions" ON public.subscriptions
  FOR INSERT WITH CHECK (true);

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Add customer_id and subscription_id to reviews
ALTER TABLE public.reviews ADD COLUMN customer_id uuid;
ALTER TABLE public.reviews ADD COLUMN subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL;
