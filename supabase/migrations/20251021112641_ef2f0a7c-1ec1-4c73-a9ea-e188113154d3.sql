-- Create profiles table for user data
CREATE TABLE public.profiles (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nombre)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'nombre', 'Usuario'));
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create proveedores table
CREATE TABLE public.proveedores (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre text NOT NULL,
  telefono text,
  correo text,
  direccion text,
  nit text,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own proveedores"
  ON public.proveedores FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own proveedores"
  ON public.proveedores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own proveedores"
  ON public.proveedores FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own proveedores"
  ON public.proveedores FOR DELETE
  USING (auth.uid() = user_id);

-- Create productos table
CREATE TABLE public.productos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre text NOT NULL,
  cantidad integer NOT NULL DEFAULT 0,
  precio numeric(10,2) NOT NULL,
  categoria text NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own productos"
  ON public.productos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own productos"
  ON public.productos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own productos"
  ON public.productos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own productos"
  ON public.productos FOR DELETE
  USING (auth.uid() = user_id);

-- Create movimientos table
CREATE TABLE public.movimientos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  producto_id uuid REFERENCES public.productos(id) ON DELETE CASCADE NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('entrada', 'salida')),
  cantidad integer NOT NULL,
  fecha timestamp with time zone DEFAULT now() NOT NULL,
  notas text,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.movimientos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own movimientos"
  ON public.movimientos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own movimientos"
  ON public.movimientos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own movimientos"
  ON public.movimientos FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_proveedores_updated_at
  BEFORE UPDATE ON public.proveedores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_productos_updated_at
  BEFORE UPDATE ON public.productos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();