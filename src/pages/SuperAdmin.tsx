import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Shield, UserPlus, Database, Trash2 } from "lucide-react";

export default function SuperAdmin() {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<"admin" | "empleado">("empleado");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkSuperAdminStatus();
    fetchUsers();
  }, []);

  const checkSuperAdminStatus = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("role", "super_admin")
      .maybeSingle();

    if (!roles) {
      navigate("/productos");
      toast({
        title: "Acceso denegado",
        description: "No tienes permisos de super administrador",
        variant: "destructive",
      });
      return;
    }

    setIsSuperAdmin(true);
    setLoading(false);
  };

  const fetchUsers = async () => {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*");

    if (profiles) {
      const usersWithRoles = await Promise.all(
        profiles.map(async (profile) => {
          const { data: roles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", profile.id);

          return {
            ...profile,
            roles: roles?.map(r => r.role) || [],
          };
        })
      );
      setUsers(usersWithRoles);
    }
  };

  const handleAssignRole = async (userId: string, role: "admin" | "empleado" | "super_admin") => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role });

      if (error) throw error;

      toast({
        title: "Rol asignado",
        description: `El rol ${role} ha sido asignado correctamente`,
      });

      fetchUsers();
    } catch (error: any) {
      console.error("Error assigning role:", error);
      toast({
        title: "Error",
        description: "No se pudo asignar el rol",
        variant: "destructive",
      });
    }
  };

  const handleRemoveRole = async (userId: string, role: "admin" | "empleado" | "super_admin") => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role);

      if (error) throw error;

      toast({
        title: "Rol removido",
        description: `El rol ${role} ha sido removido correctamente`,
      });

      fetchUsers();
    } catch (error: any) {
      console.error("Error removing role:", error);
      toast({
        title: "Error",
        description: "No se pudo remover el rol",
        variant: "destructive",
      });
    }
  };

  const handleMakeMeSuperAdmin = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: session.user.id, role: "super_admin" });

      if (error) {
        // Si ya existe el rol, actualizar la página
        if (error.code === '23505') {
          toast({
            title: "Ya eres super administrador",
            description: "Tu cuenta ya tiene permisos de super administrador",
          });
          fetchUsers();
          setIsSuperAdmin(true);
          return;
        }
        throw error;
      }

      toast({
        title: "Super Admin creado",
        description: "Ahora tienes permisos de super administrador",
      });
      
      setIsSuperAdmin(true);
      fetchUsers();
      // Recargar para actualizar permisos
      window.location.reload();
    } catch (error: any) {
      console.error("Error creating super admin:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el super admin",
        variant: "destructive",
      });
    }
  };

  const handleDeleteDatabase = async () => {
    toast({
      title: "Acción extremadamente peligrosa",
      description: "Para eliminar toda la base de datos, contacta al administrador del sistema. Esta acción es irreversible.",
      variant: "destructive",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              Convertirse en Super Administrador
            </CardTitle>
            <CardDescription>
              No hay super administradores en el sistema. Puedes convertirte en el primer super admin.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Como super administrador podrás:
              </p>
              <ul className="mt-2 space-y-1 text-sm">
                <li>✓ Asignar roles de admin y empleado</li>
                <li>✓ Gestionar todos los usuarios</li>
                <li>✓ Acceso completo a todas las funciones</li>
              </ul>
            </div>
            <Button 
              onClick={handleMakeMeSuperAdmin} 
              className="w-full"
              size="lg"
            >
              <Shield className="h-4 w-4 mr-2" />
              Convertirme en Super Admin
            </Button>
            <Button 
              onClick={() => navigate("/productos")} 
              variant="outline"
              className="w-full"
            >
              Volver al inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Panel de Super Administrador</h1>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Gestión de Usuarios
              </CardTitle>
              <CardDescription>
                Administra roles y permisos de usuarios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay usuarios registrados aún
                  </div>
                ) : (
                  users.map((user) => (
                    <div key={user.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium text-lg">{user.nombre} {user.apellidos}</p>
                          <p className="text-xs text-muted-foreground mt-1">ID: {user.id.substring(0, 8)}...</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-muted-foreground">
                              {user.verified ? "✓ Verificado" : "⚠ No verificado"}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1 justify-end">
                          {user.roles.length === 0 ? (
                            <span className="text-xs bg-muted px-2 py-1 rounded">Sin rol</span>
                          ) : (
                            user.roles.map((role: "admin" | "empleado" | "super_admin") => (
                              <Button
                                key={role}
                                variant="secondary"
                                size="sm"
                                onClick={() => handleRemoveRole(user.id, role)}
                                className="text-xs gap-1"
                              >
                                {role === "super_admin" ? "Super Admin" : role === "admin" ? "Admin" : "Empleado"}
                                <span className="opacity-70">✕</span>
                              </Button>
                            ))
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Select onValueChange={(value) => {
                          if (value === "empleado" || value === "admin" || value === "super_admin") {
                            handleAssignRole(user.id, value);
                          }
                        }}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="+ Asignar rol" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="empleado">👤 Empleado (solo lectura)</SelectItem>
                            <SelectItem value="admin">👨‍💼 Administrador (crear/editar/eliminar)</SelectItem>
                            <SelectItem value="super_admin">👑 Super Admin (control total)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Información del Sistema
              </CardTitle>
              <CardDescription>
                Estadísticas y estado del sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">Total de usuarios:</span>
                  <span className="text-lg font-bold">{users.length}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">Super Admins:</span>
                  <span className="text-lg font-bold">
                    {users.filter(u => u.roles.includes("super_admin")).length}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">Administradores:</span>
                  <span className="text-lg font-bold">
                    {users.filter(u => u.roles.includes("admin")).length}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">Empleados:</span>
                  <span className="text-lg font-bold">
                    {users.filter(u => u.roles.includes("empleado")).length}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">Sin rol:</span>
                  <span className="text-lg font-bold text-muted-foreground">
                    {users.filter(u => u.roles.length === 0).length}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full" size="sm">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar Base de Datos Completa
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-destructive">⚠️ PELIGRO EXTREMO</AlertDialogTitle>
                      <AlertDialogDescription className="space-y-2">
                        <p className="font-bold">Esta acción eliminará TODA la base de datos de forma permanente e irreversible.</p>
                        <p>Se perderán:</p>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          <li>Todos los productos</li>
                          <li>Todos los proveedores</li>
                          <li>Todas las categorías</li>
                          <li>Todos los movimientos</li>
                          <li>Todos los usuarios y permisos</li>
                        </ul>
                        <p className="text-destructive font-semibold mt-4">Esta operación NO se puede deshacer.</p>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteDatabase}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Entiendo los riesgos - Eliminar TODO
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
