import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Bell, CheckCircle2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Notificacion {
  id: string;
  producto_id: string;
  mensaje: string;
  nivel_stock: number;
  estado: string;
  created_at: string;
  resolved_at: string | null;
  productos: {
    nombre: string;
  };
}

const Notificaciones = () => {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchNotificaciones();

    // Suscribirse a cambios en tiempo real
    const channel = supabase
      .channel('notificaciones-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notificaciones_stock'
        },
        () => {
          fetchNotificaciones();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchNotificaciones = async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return;

    const { data, error } = await supabase
      .from("notificaciones_stock")
      .select(`
        *,
        productos (
          nombre
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar las notificaciones.",
      });
    } else {
      setNotificaciones(data || []);
    }
  };

  const marcarComoResuelta = async (id: string) => {
    const { error } = await supabase
      .from("notificaciones_stock")
      .update({ estado: "resuelto", resolved_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar la notificación.",
      });
    } else {
      toast({
        title: "Éxito",
        description: "Notificación marcada como resuelta.",
      });
      fetchNotificaciones();
    }
  };

  const pendientes = notificaciones.filter(n => n.estado === 'pendiente');
  const resueltas = notificaciones.filter(n => n.estado === 'resuelto');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold">Notificaciones de Stock</h2>
          <Badge variant="destructive" className="text-lg px-4 py-2">
            {pendientes.length} Pendientes
          </Badge>
        </div>

        {/* Notificaciones Pendientes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Alertas Activas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendientes.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No hay alertas pendientes
              </p>
            ) : (
              <div className="space-y-3">
                {pendientes.map((notificacion) => (
                  <div
                    key={notificacion.id}
                    className="flex items-start justify-between p-4 border rounded-lg bg-destructive/5"
                  >
                    <div className="flex gap-3 flex-1">
                      <Bell className="h-5 w-5 text-destructive mt-1" />
                      <div className="flex-1">
                        <p className="font-medium">{notificacion.mensaje}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {format(new Date(notificacion.created_at), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => marcarComoResuelta(notificacion.id)}
                    >
                      Resolver
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notificaciones Resueltas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              Historial Resuelto
            </CardTitle>
          </CardHeader>
          <CardContent>
            {resueltas.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No hay notificaciones resueltas
              </p>
            ) : (
              <div className="space-y-3">
                {resueltas.map((notificacion) => (
                  <div
                    key={notificacion.id}
                    className="flex items-start gap-3 p-4 border rounded-lg opacity-60"
                  >
                    <CheckCircle2 className="h-5 w-5 text-success mt-1" />
                    <div className="flex-1">
                      <p className="font-medium line-through">{notificacion.mensaje}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Resuelto el {notificacion.resolved_at && format(new Date(notificacion.resolved_at), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Notificaciones;
