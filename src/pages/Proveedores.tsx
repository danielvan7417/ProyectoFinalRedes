import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { z } from "zod";

const proveedorSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es requerido").max(100, "El nombre debe tener máximo 100 caracteres"),
  telefono: z.string().trim().max(20, "El teléfono debe tener máximo 20 caracteres").regex(/^[0-9+\-\s()]*$/, "El teléfono solo puede contener números, +, -, espacios y paréntesis").optional().or(z.literal("")),
  correo: z.string().trim().email("Debe ser un correo válido").max(255, "El correo debe tener máximo 255 caracteres").optional().or(z.literal("")),
  nit: z.string().trim().max(50, "El NIT debe tener máximo 50 caracteres").optional().or(z.literal("")),
  direccion: z.string().trim().max(500, "La dirección debe tener máximo 500 caracteres").optional().or(z.literal("")),
});

interface Proveedor {
  id: string;
  nombre: string;
  telefono: string | null;
  correo: string | null;
  direccion: string | null;
  nit: string | null;
}

const Proveedores = () => {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nombre: "",
    telefono: "",
    correo: "",
    direccion: "",
    nit: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchProveedores();
  }, []);

  const fetchProveedores = async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return;

    const { data, error } = await supabase
      .from("proveedores")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los proveedores.",
      });
    } else {
      setProveedores(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return;

    try {
      const validationResult = proveedorSchema.safeParse({
        nombre: formData.nombre,
        telefono: formData.telefono,
        correo: formData.correo,
        nit: formData.nit,
        direccion: formData.direccion,
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

      const proveedorData = {
        nombre: validationResult.data.nombre,
        telefono: validationResult.data.telefono || null,
        correo: validationResult.data.correo || null,
        direccion: validationResult.data.direccion || null,
        nit: validationResult.data.nit || null,
        user_id: session.session.user.id,
      };

    if (editingId) {
      const { error } = await supabase
        .from("proveedores")
        .update(proveedorData)
        .eq("id", editingId);

      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo actualizar el proveedor.",
        });
      } else {
        toast({
          title: "Éxito",
          description: "Proveedor actualizado correctamente.",
        });
      }
    } else {
      const { error } = await supabase
        .from("proveedores")
        .insert([proveedorData]);

      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo crear el proveedor.",
        });
      } else {
        toast({
          title: "Éxito",
          description: "Proveedor creado correctamente.",
        });
      }
    }

      setOpen(false);
      setFormData({ nombre: "", telefono: "", correo: "", direccion: "", nit: "" });
      setEditingId(null);
      fetchProveedores();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Ocurrió un error al procesar el proveedor.",
      });
    }
  };

  const handleEdit = (proveedor: Proveedor) => {
    setEditingId(proveedor.id);
    setFormData({
      nombre: proveedor.nombre,
      telefono: proveedor.telefono || "",
      correo: proveedor.correo || "",
      direccion: proveedor.direccion || "",
      nit: proveedor.nit || "",
    });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("proveedores")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar el proveedor.",
      });
    } else {
      toast({
        title: "Éxito",
        description: "Proveedor eliminado correctamente.",
      });
      fetchProveedores();
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold">Proveedores</h2>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-lg gap-2">
                <Plus className="h-4 w-4" />
                Nuevo Proveedor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Editar Proveedor" : "Nuevo Proveedor"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre *</Label>
                    <Input
                      id="nombre"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefono">Teléfono</Label>
                    <Input
                      id="telefono"
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="correo">Correo</Label>
                    <Input
                      id="correo"
                      type="email"
                      value={formData.correo}
                      onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nit">NIT</Label>
                    <Input
                      id="nit"
                      value={formData.nit}
                      onChange={(e) => setFormData({ ...formData, nit: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="direccion">Dirección</Label>
                    <Input
                      id="direccion"
                      value={formData.direccion}
                      onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                    />
                  </div>
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
            <CardTitle>Lista de Proveedores</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Correo</TableHead>
                  <TableHead>NIT</TableHead>
                  <TableHead>Dirección</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proveedores.map((proveedor) => (
                  <TableRow key={proveedor.id}>
                    <TableCell className="font-medium">{proveedor.nombre}</TableCell>
                    <TableCell>{proveedor.telefono || "-"}</TableCell>
                    <TableCell>{proveedor.correo || "-"}</TableCell>
                    <TableCell>{proveedor.nit || "-"}</TableCell>
                    <TableCell>{proveedor.direccion || "-"}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(proveedor)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(proveedor.id)}
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

export default Proveedores;