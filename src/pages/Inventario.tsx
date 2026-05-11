import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";

interface InventarioItem {
  id: string;
  nombre: string;
  cantidad: number;
  precio: number;
  categoria: string;
}

const Inventario = () => {
  const [inventario, setInventario] = useState<InventarioItem[]>([]);
  const [stats, setStats] = useState({
    totalProductos: 0,
    valorTotal: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchInventario();
  }, []);

  const fetchInventario = async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return;

    const { data, error } = await supabase
      .from("productos")
      .select("*")
      .order("nombre");

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo cargar el inventario.",
      });
    } else {
      setInventario(data || []);
      
      const totalProductos = data?.reduce((sum, item) => sum + item.cantidad, 0) || 0;
      const valorTotal = data?.reduce((sum, item) => sum + (item.cantidad * item.precio), 0) || 0;
      
      setStats({
        totalProductos,
        valorTotal,
      });
    }
  };

  const getStockStatus = (cantidad: number) => {
    if (cantidad === 0) return { label: "Sin stock", variant: "destructive" as const };
    if (cantidad < 10) return { label: "Stock bajo", variant: "secondary" as const };
    return { label: "En stock", variant: "default" as const };
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h2 className="text-3xl font-bold">Inventario</h2>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inventario.length}</div>
              <p className="text-xs text-muted-foreground">
                Tipos de productos diferentes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unidades Totales</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProductos}</div>
              <p className="text-xs text-muted-foreground">
                En todos los productos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.valorTotal.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                Valor del inventario
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Estado del Inventario</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Precio Unitario</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventario.map((item) => {
                  const status = getStockStatus(item.cantidad);
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.nombre}</TableCell>
                      <TableCell>{item.categoria}</TableCell>
                      <TableCell className="font-semibold">{item.cantidad}</TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell>${item.precio.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-semibold">
                        ${(item.cantidad * item.precio).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Inventario;