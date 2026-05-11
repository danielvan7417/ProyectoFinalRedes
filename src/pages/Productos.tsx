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
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { z } from "zod";

const productoSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es requerido").max(100, "El nombre debe tener máximo 100 caracteres"),
  cantidad: z.number().int("La cantidad debe ser un número entero").min(0, "La cantidad no puede ser negativa"),
  precio: z.number().positive("El precio debe ser mayor a 0"),
  categoria_id: z.string().uuid("Debe seleccionar una categoría válida"),
});

interface Producto {
  id: string;
  nombre: string;
  cantidad: number;
  precio: number;
  categoria_id: string;
  categorias?: {
    nombre: string;
  };
}

interface Categoria {
  id: string;
  nombre: string;
}

const Productos = () => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nombre: "",
    cantidad: "",
    precio: "",
    categoria_id: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchProductos();
    fetchCategorias();
  }, []);

  const fetchCategorias = async () => {
    const { data, error } = await supabase
      .from("categorias")
      .select("*")
      .order("nombre");

    if (!error && data) {
      setCategorias(data);
    }
  };

  const fetchProductos = async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return;

    const { data, error } = await supabase
      .from("productos")
      .select(`
        *,
        categorias (
          nombre
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los productos.",
      });
    } else {
      setProductos(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return;

    try {
      const parsedCantidad = parseInt(formData.cantidad);
      const parsedPrecio = parseFloat(formData.precio);

      if (isNaN(parsedCantidad) || isNaN(parsedPrecio)) {
        toast({
          variant: "destructive",
          title: "Error de validación",
          description: "La cantidad y el precio deben ser números válidos.",
        });
        return;
      }

      const validationResult = productoSchema.safeParse({
        nombre: formData.nombre,
        cantidad: parsedCantidad,
        precio: parsedPrecio,
        categoria_id: formData.categoria_id,
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

      const categoria = categorias.find(c => c.id === formData.categoria_id);
      
      const productData = {
        nombre: validationResult.data.nombre,
        cantidad: validationResult.data.cantidad,
        precio: validationResult.data.precio,
        categoria: categoria?.nombre || '',
        categoria_id: validationResult.data.categoria_id,
        user_id: session.session.user.id,
      };

    if (editingId) {
      const { error } = await supabase
        .from("productos")
        .update(productData)
        .eq("id", editingId);

      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo actualizar el producto.",
        });
      } else {
        toast({
          title: "Éxito",
          description: "Producto actualizado correctamente.",
        });
      }
    } else {
      const { error } = await supabase
        .from("productos")
        .insert([productData]);

      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo crear el producto.",
        });
      } else {
        toast({
          title: "Éxito",
          description: "Producto creado correctamente.",
        });
      }
    }

      setOpen(false);
      setFormData({ nombre: "", cantidad: "", precio: "", categoria_id: "" });
      setEditingId(null);
      fetchProductos();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Ocurrió un error al procesar el producto.",
      });
    }
  };

  const handleEdit = (producto: Producto) => {
    setEditingId(producto.id);
    setFormData({
      nombre: producto.nombre,
      cantidad: producto.cantidad.toString(),
      precio: producto.precio.toString(),
      categoria_id: producto.categoria_id,
    });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("productos")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar el producto.",
      });
    } else {
      toast({
        title: "Éxito",
        description: "Producto eliminado correctamente.",
      });
      fetchProductos();
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold">Productos</h2>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-lg gap-2">
                <Plus className="h-4 w-4" />
                Nuevo Producto
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Editar Producto" : "Nuevo Producto"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cantidad">Cantidad</Label>
                  <Input
                    id="cantidad"
                    type="number"
                    value={formData.cantidad}
                    onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="precio">Precio</Label>
                  <Input
                    id="precio"
                    type="number"
                    step="0.01"
                    value={formData.precio}
                    onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="categoria">Categoría</Label>
                  <Select
                    value={formData.categoria_id}
                    onValueChange={(value) => setFormData({ ...formData, categoria_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categorias.map((categoria) => (
                        <SelectItem key={categoria.id} value={categoria.id}>
                          {categoria.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full">
                  {editingId ? "Actualizar" : "Crear"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Productos</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productos.map((producto) => (
                  <TableRow key={producto.id}>
                    <TableCell className="font-medium">{producto.nombre}</TableCell>
                    <TableCell>{producto.cantidad}</TableCell>
                    <TableCell>${producto.precio.toFixed(2)}</TableCell>
                    <TableCell>{producto.categorias?.nombre || 'Sin categoría'}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(producto)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(producto.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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

export default Productos;