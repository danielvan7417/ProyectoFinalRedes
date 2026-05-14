import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, ArrowUp, ArrowDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { z } from "zod";

const movimientoSchema = z.object({
  producto_id: z.string().uuid("Debe seleccionar un producto válido"),
  tipo: z.enum(["entrada", "salida"], { required_error: "El tipo de movimiento es requerido" }),
  cantidad: z.number().int("La cantidad debe ser un número entero").positive("La cantidad debe ser mayor a 0"),
  notas: z.string().trim().max(1000, "Las notas deben tener máximo 1000 caracteres").optional().or(z.literal("")),
});

interface Movimiento {
  id: string;
  producto_id: string;
  tipo: "entrada" | "salida";
  cantidad: number;
  fecha: string;
  notas: string | null;
  productos?: { nombre: string };
}

interface Producto {
  id: string;
  nombre: string;
}

const Movimientos = () => {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    producto_id: "",
    tipo: "entrada" as "entrada" | "salida",
    cantidad: "",
    notas: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchMovimientos();
    fetchProductos();
  }, []);

  const fetchMovimientos = async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return;

    const { data, error } = await supabase
      .from("movimientos")
      .select("*, productos(nombre)")
      .order("fecha", { ascending: false });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los movimientos.",
      });
    } else {
      setMovimientos((data as any) || []);
    }
  };

  const fetchProductos = async () => {
    const { data, error } = await supabase
      .from("productos")
      .select("id, nombre")
      .order("nombre");

    if (!error) {
      setProductos(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return;

    try {
      const parsedCantidad = parseInt(formData.cantidad);

      if (isNaN(parsedCantidad)) {
        toast({
          variant: "destructive",
          title: "Error de validación",
          description: "La cantidad debe ser un número válido.",
        });
        return;
      }

      const validationResult = movimientoSchema.safeParse({
        producto_id: formData.producto_id,
        tipo: formData.tipo,
        cantidad: parsedCantidad,
        notas: formData.notas,
      });

      if (!validationResult.success) {
        const errorMessage = validationResult.error.errors[0]?.message || "Error de validación";
        toast({
          variant: "destructive",
          title: "Error de validación",
          description: errorMessage,
        });
        return;
      }

      const movimientoData = {
        producto_id: validationResult.data.producto_id,
        tipo: validationResult.data.tipo,
        cantidad: validationResult.data.tipo === "entrada" ? validationResult.data.cantidad : -validationResult.data.cantidad,
        notas: validationResult.data.notas || null,
        user_id: session.session.user.id,
      };

      const { error } = await supabase
        .from("movimientos")
        .insert([movimientoData]);

      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo registrar el movimiento.",
        });
      } else {
        // Actualizar cantidad del producto
        const producto = productos.find(p => p.id === formData.producto_id);
        if (producto) {
          const { data: productoData } = await supabase
            .from("productos")
            .select("cantidad")
            .eq("id", formData.producto_id)
            .single();

          if (productoData) {
            const nuevaCantidad = productoData.cantidad + movimientoData.cantidad;

            await supabase
              .from("productos")
              .update({ cantidad: nuevaCantidad })
              .eq("id", formData.producto_id);
          }
        }

        toast({
          title: "Éxito",
          description: "Movimiento registrado correctamente.",
        });
        setOpen(false);
        setFormData({ producto_id: "", tipo: "entrada", cantidad: "", notas: "" });
        fetchMovimientos();
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Ocurrió un error al procesar el movimiento.",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold">Movimientos</h2>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-lg gap-2">
                <Plus className="h-4 w-4" />
                Nuevo Movimiento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Movimiento</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="producto">Producto</Label>
                  <Select
                    value={formData.producto_id}
                    onValueChange={(value) => setFormData({ ...formData, producto_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar producto" />
                    </SelectTrigger>
                    <SelectContent>
                      {productos.map((producto) => (
                        <SelectItem key={producto.id} value={producto.id}>
                          {producto.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo de Movimiento</Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(value: "entrada" | "salida") => {
                      setFormData({ ...formData, tipo: value });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entrada">Entrada</SelectItem>
                      <SelectItem value="salida">Salida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cantidad">Cantidad</Label>
                  <Input
                    id="cantidad"
                    type="number"
                    min={1}
                    value={formData.cantidad}
                    onChange={(e) => {
                      const valor = e.target.value;
                      if (valor === "" || (!isNaN(parseInt(valor)) && parseInt(valor) > 0)) {
                        setFormData({ ...formData, cantidad: valor });
                      }
                    }}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notas">Notas (opcional)</Label>
                  <Textarea
                    id="notas"
                    value={formData.notas}
                    onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                    placeholder="Información adicional..."
                  />
                </div>
                <Button type="submit" className="w-full">
                  Registrar
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Historial de Movimientos</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Notas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movimientos.map((mov) => (
                  <TableRow key={mov.id}>
                    <TableCell className="font-medium">
                      {mov.productos?.nombre}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={mov.tipo === "entrada" ? "default" : "secondary"}
                        className="gap-1"
                      >
                        {mov.tipo === "entrada" ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        )}
                        {mov.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell>{mov.cantidad}</TableCell>
                    <TableCell>
                      {new Date(mov.fecha).toLocaleDateString("es-ES")}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {mov.notas || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Movimientos;