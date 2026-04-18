-- Helper: admin policies bruger has_role(auth.uid(), 'admin')

-- BUSINESSES
CREATE POLICY "Admins can view all businesses" ON public.businesses
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update all businesses" ON public.businesses
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete all businesses" ON public.businesses
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ORDERS
CREATE POLICY "Admins can view all orders" ON public.orders
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update all orders" ON public.orders
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete all orders" ON public.orders
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ORDER ITEMS
CREATE POLICY "Admins can view all order items" ON public.order_items
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete all order items" ON public.order_items
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- SUBSCRIPTIONS
CREATE POLICY "Admins can view all subscriptions" ON public.subscriptions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update all subscriptions" ON public.subscriptions
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete all subscriptions" ON public.subscriptions
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- PROFILES
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- REVIEWS
CREATE POLICY "Admins can view all reviews" ON public.reviews
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete all reviews" ON public.reviews
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- QUOTE REQUESTS
CREATE POLICY "Admins can view all quote requests" ON public.quote_requests
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete all quote requests" ON public.quote_requests
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- QUOTES
CREATE POLICY "Admins can view all quotes" ON public.quotes
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- USER ROLES (admin kan tildele/se roller)
CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert roles" ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles" ON public.user_roles
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));