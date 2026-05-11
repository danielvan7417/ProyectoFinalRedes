-- Crear enum para los roles de la aplicación
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'empleado');

-- Crear tabla para roles de usuarios
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Habilitar RLS en user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Política para que los usuarios puedan ver sus propios roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Política para que solo super_admins puedan insertar roles
CREATE POLICY "Only super_admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

-- Política para que solo super_admins puedan actualizar roles
CREATE POLICY "Only super_admins can update roles"
ON public.user_roles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

-- Política para que solo super_admins puedan eliminar roles
CREATE POLICY "Only super_admins can delete roles"
ON public.user_roles
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

-- Crear función security definer para verificar roles (evita recursión en RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Crear tabla para PINs de verificación
CREATE TABLE public.verification_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pin TEXT NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '15 minutes'),
  verified_at TIMESTAMP WITH TIME ZONE
);

-- Habilitar RLS en verification_pins
ALTER TABLE public.verification_pins ENABLE ROW LEVEL SECURITY;

-- Política para que los usuarios puedan ver sus propios PINs
CREATE POLICY "Users can view their own pins"
ON public.verification_pins
FOR SELECT
USING (auth.uid() = user_id);

-- Política para que los usuarios puedan actualizar sus propios PINs
CREATE POLICY "Users can update their own pins"
ON public.verification_pins
FOR UPDATE
USING (auth.uid() = user_id);

-- Añadir columna verified a profiles
ALTER TABLE public.profiles ADD COLUMN verified BOOLEAN NOT NULL DEFAULT false;

-- Actualizar políticas de RLS en todas las tablas para incluir verificación de roles

-- Productos: Solo admins y super_admins pueden crear/actualizar/eliminar
DROP POLICY IF EXISTS "Users can insert their own productos" ON public.productos;
DROP POLICY IF EXISTS "Users can update their own productos" ON public.productos;
DROP POLICY IF EXISTS "Users can delete their own productos" ON public.productos;

CREATE POLICY "Admins and super_admins can insert productos"
ON public.productos
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'super_admin')
  )
);

CREATE POLICY "Admins and super_admins can update productos"
ON public.productos
FOR UPDATE
USING (
  auth.uid() = user_id AND (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'super_admin')
  )
);

CREATE POLICY "Only super_admins can delete productos"
ON public.productos
FOR DELETE
USING (
  auth.uid() = user_id AND public.has_role(auth.uid(), 'super_admin')
);

-- Categorías: Solo admins y super_admins pueden crear/actualizar/eliminar
DROP POLICY IF EXISTS "Users can insert their own categorias" ON public.categorias;
DROP POLICY IF EXISTS "Users can update their own categorias" ON public.categorias;
DROP POLICY IF EXISTS "Users can delete their own categorias" ON public.categorias;

CREATE POLICY "Admins and super_admins can insert categorias"
ON public.categorias
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'super_admin')
  )
);

CREATE POLICY "Admins and super_admins can update categorias"
ON public.categorias
FOR UPDATE
USING (
  auth.uid() = user_id AND (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'super_admin')
  )
);

CREATE POLICY "Only super_admins can delete categorias"
ON public.categorias
FOR DELETE
USING (
  auth.uid() = user_id AND public.has_role(auth.uid(), 'super_admin')
);

-- Proveedores: Solo admins y super_admins pueden crear/actualizar/eliminar
DROP POLICY IF EXISTS "Users can insert their own proveedores" ON public.proveedores;
DROP POLICY IF EXISTS "Users can update their own proveedores" ON public.proveedores;
DROP POLICY IF EXISTS "Users can delete their own proveedores" ON public.proveedores;

CREATE POLICY "Admins and super_admins can insert proveedores"
ON public.proveedores
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'super_admin')
  )
);

CREATE POLICY "Admins and super_admins can update proveedores"
ON public.proveedores
FOR UPDATE
USING (
  auth.uid() = user_id AND (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'super_admin')
  )
);

CREATE POLICY "Only super_admins can delete proveedores"
ON public.proveedores
FOR DELETE
USING (
  auth.uid() = user_id AND public.has_role(auth.uid(), 'super_admin')
);