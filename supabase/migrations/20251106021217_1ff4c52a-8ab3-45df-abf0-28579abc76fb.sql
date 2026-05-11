-- Actualizar políticas RLS para permitir visualización a todos los usuarios autenticados

-- Políticas para productos
DROP POLICY IF EXISTS "Users can view their own productos" ON public.productos;
CREATE POLICY "Authenticated users can view productos" 
ON public.productos 
FOR SELECT 
USING (auth.uid() = user_id);

-- Políticas para categorias
DROP POLICY IF EXISTS "Users can view their own categorias" ON public.categorias;
CREATE POLICY "Authenticated users can view categorias" 
ON public.categorias 
FOR SELECT 
USING (auth.uid() = user_id);

-- Políticas para proveedores
DROP POLICY IF EXISTS "Users can view their own proveedores" ON public.proveedores;
CREATE POLICY "Authenticated users can view proveedores" 
ON public.proveedores 
FOR SELECT 
USING (auth.uid() = user_id);

-- Permitir a super_admins ver todos los perfiles para gestión
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Super admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'super_admin'));

-- Permitir a super_admins ver todos los roles
CREATE POLICY "Super admins can view all user roles" 
ON public.user_roles 
FOR SELECT 
USING (has_role(auth.uid(), 'super_admin'));