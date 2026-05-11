import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

const authSchema = z.object({
  email: z.string().email("Debe ser un correo válido").max(255, "El correo debe tener máximo 255 caracteres"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(72, "La contraseña debe tener máximo 72 caracteres"),
  nombre: z.string().trim().min(1, "El nombre es requerido").max(100, "El nombre debe tener máximo 100 caracteres").optional(),
  apellidos: z.string().trim().max(100, "Los apellidos deben tener máximo 100 caracteres").optional(),
  telefono: z.string().trim().regex(/^[0-9+\-\s()]*$/, "El teléfono solo puede contener números, +, -, espacios y paréntesis").max(20, "El teléfono debe tener máximo 20 caracteres").optional(),
});

export const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [telefono, setTelefono] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validationResult = authSchema.safeParse({
        email,
        password,
        nombre: isLogin ? undefined : nombre,
        apellidos: isLogin ? undefined : apellidos,
        telefono: isLogin ? undefined : telefono,
      });

      if (!validationResult.success) {
        const errorMessage = validationResult.error.errors[0]?.message || "Error de validación";
        toast({
          variant: "destructive",
          title: "Error de validación",
          description: errorMessage,
        });
        setLoading(false);
        return;
      }

      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) throw error;
        
        toast({
          title: "¡Bienvenido!",
          description: "Has iniciado sesión correctamente.",
        });
        navigate("/productos");
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { nombre, apellidos, telefono },
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        
        if (error) throw error;

        toast({
          title: "¡Registro exitoso!",
          description: "Has creado tu cuenta correctamente.",
        });
        
        navigate("/productos");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <Card className="w-full max-w-md shadow-2xl border-primary/10">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg">
            <Package className="w-10 h-10 text-primary-foreground" />
          </div>
          <CardTitle className="text-3xl font-bold">
            Ferrehernan
          </CardTitle>
          <CardDescription className="text-base">
            {isLogin ? "Inicia sesión en tu cuenta" : "Crea tu cuenta nueva"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombres</Label>
                  <Input
                    id="nombre"
                    type="text"
                    placeholder="Tus nombres"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    required={!isLogin}
                    className="transition-all focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apellidos">Apellidos</Label>
                  <Input
                    id="apellidos"
                    type="text"
                    placeholder="Tus apellidos"
                    value={apellidos}
                    onChange={(e) => setApellidos(e.target.value)}
                    required={!isLogin}
                    className="transition-all focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input
                    id="telefono"
                    type="tel"
                    placeholder="Tu número de teléfono"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    required={!isLogin}
                    className="transition-all focus:ring-2 focus:ring-primary"
                  />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="transition-all focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="transition-all focus:ring-2 focus:ring-primary"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full h-11 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cargando...
                </>
              ) : (
                isLogin ? "Iniciar Sesión" : "Crear Cuenta"
              )}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <Button
              variant="ghost"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm hover:text-primary transition-colors"
            >
              {isLogin ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia sesión"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};