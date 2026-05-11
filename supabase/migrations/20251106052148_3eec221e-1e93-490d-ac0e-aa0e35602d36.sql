-- Paso 1: Eliminar las foreign keys incorrectas que referencian auth.users
ALTER TABLE IF EXISTS public.productos DROP CONSTRAINT IF EXISTS productos_user_id_fkey;
ALTER TABLE IF EXISTS public.categorias DROP CONSTRAINT IF EXISTS categorias_user_id_fkey;
ALTER TABLE IF EXISTS public.proveedores DROP CONSTRAINT IF EXISTS proveedores_user_id_fkey;
ALTER TABLE IF EXISTS public.movimientos DROP CONSTRAINT IF EXISTS movimientos_user_id_fkey;
ALTER TABLE IF EXISTS public.notificaciones_stock DROP CONSTRAINT IF EXISTS notificaciones_stock_user_id_fkey;
ALTER TABLE IF EXISTS public.producto_proveedor DROP CONSTRAINT IF EXISTS producto_proveedor_user_id_fkey;

-- Paso 2: Insertar perfiles para usuarios existentes que no tienen perfil
INSERT INTO public.profiles (id, nombre, apellidos, telefono, verified)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'nombre', 'Usuario') as nombre,
  COALESCE(u.raw_user_meta_data->>'apellidos', '') as apellidos,
  COALESCE(u.raw_user_meta_data->>'telefono', '') as telefono,
  false as verified
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- Paso 3: Crear las foreign keys correctas que referencian profiles
ALTER TABLE public.productos 
  ADD CONSTRAINT productos_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES public.profiles(id) 
  ON DELETE CASCADE;

ALTER TABLE public.categorias 
  ADD CONSTRAINT categorias_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES public.profiles(id) 
  ON DELETE CASCADE;

ALTER TABLE public.proveedores 
  ADD CONSTRAINT proveedores_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES public.profiles(id) 
  ON DELETE CASCADE;

ALTER TABLE public.movimientos 
  ADD CONSTRAINT movimientos_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES public.profiles(id) 
  ON DELETE CASCADE;

ALTER TABLE public.notificaciones_stock 
  ADD CONSTRAINT notificaciones_stock_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES public.profiles(id) 
  ON DELETE CASCADE;

ALTER TABLE public.producto_proveedor 
  ADD CONSTRAINT producto_proveedor_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES public.profiles(id) 
  ON DELETE CASCADE;

-- Paso 4: Recrear el trigger para asegurar que funciona correctamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nombre, apellidos, telefono)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'nombre', 'Usuario'),
    COALESCE(new.raw_user_meta_data->>'apellidos', ''),
    COALESCE(new.raw_user_meta_data->>'telefono', '')
  );
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();