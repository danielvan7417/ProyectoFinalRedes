-- 1. Actualizar tabla profiles para incluir nombres, apellidos y teléfono
ALTER TABLE public.profiles 
ADD COLUMN apellidos TEXT,
ADD COLUMN telefono TEXT;

-- Actualizar el trigger para incluir los nuevos campos
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

-- Recrear el trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. Crear tabla de categorías
CREATE TABLE public.categorias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS para categorías
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para categorías
CREATE POLICY "Users can view their own categorias"
ON public.categorias FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own categorias"
ON public.categorias FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categorias"
ON public.categorias FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categorias"
ON public.categorias FOR DELETE
USING (auth.uid() = user_id);

-- Trigger para updated_at en categorías
CREATE TRIGGER update_categorias_updated_at
BEFORE UPDATE ON public.categorias
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Modificar tabla productos para usar categoría como foreign key
ALTER TABLE public.productos 
ADD COLUMN categoria_id UUID REFERENCES public.categorias(id);

-- 4. Crear tabla intermedia producto_proveedor (relación muchos a muchos)
CREATE TABLE public.producto_proveedor (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  producto_id UUID NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
  proveedor_nit TEXT NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS para producto_proveedor
ALTER TABLE public.producto_proveedor ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para producto_proveedor
CREATE POLICY "Users can view their own producto_proveedor"
ON public.producto_proveedor FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own producto_proveedor"
ON public.producto_proveedor FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own producto_proveedor"
ON public.producto_proveedor FOR DELETE
USING (auth.uid() = user_id);

-- 5. Crear tabla de notificaciones de stock
CREATE TABLE public.notificaciones_stock (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  producto_id UUID NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
  mensaje TEXT NOT NULL,
  nivel_stock INTEGER NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente', -- pendiente, resuelto
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS para notificaciones_stock
ALTER TABLE public.notificaciones_stock ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para notificaciones_stock
CREATE POLICY "Users can view their own notificaciones_stock"
ON public.notificaciones_stock FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notificaciones_stock"
ON public.notificaciones_stock FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notificaciones_stock"
ON public.notificaciones_stock FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notificaciones_stock"
ON public.notificaciones_stock FOR DELETE
USING (auth.uid() = user_id);

-- 6. Crear función para verificar stock y generar notificaciones
CREATE OR REPLACE FUNCTION public.check_stock_and_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_producto_nombre TEXT;
  v_notification_exists BOOLEAN;
BEGIN
  -- Obtener el user_id del producto
  SELECT user_id, nombre INTO v_user_id, v_producto_nombre
  FROM public.productos
  WHERE id = NEW.id;

  -- Si el stock es bajo (menor a 5)
  IF NEW.cantidad < 5 THEN
    -- Verificar si ya existe una notificación pendiente para este producto
    SELECT EXISTS (
      SELECT 1 FROM public.notificaciones_stock
      WHERE producto_id = NEW.id 
      AND estado = 'pendiente'
    ) INTO v_notification_exists;

    -- Solo crear notificación si no existe una pendiente
    IF NOT v_notification_exists THEN
      INSERT INTO public.notificaciones_stock (producto_id, mensaje, nivel_stock, user_id)
      VALUES (
        NEW.id,
        'El producto "' || v_producto_nombre || '" tiene stock bajo (' || NEW.cantidad || ' unidades)',
        NEW.cantidad,
        v_user_id
      );
    END IF;
  ELSE
    -- Si el stock es suficiente, marcar notificaciones pendientes como resueltas
    UPDATE public.notificaciones_stock
    SET estado = 'resuelto',
        resolved_at = now()
    WHERE producto_id = NEW.id 
    AND estado = 'pendiente';
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger para verificar stock en productos
CREATE TRIGGER check_stock_trigger
AFTER INSERT OR UPDATE OF cantidad ON public.productos
FOR EACH ROW EXECUTE FUNCTION public.check_stock_and_notify();