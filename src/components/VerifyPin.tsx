import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";

interface VerifyPinProps {
  userId: string;
  email: string;
}

export const VerifyPin = ({ userId, email }: VerifyPinProps) => {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleVerify = async () => {
    if (pin.length !== 6) {
      toast({
        title: "PIN incompleto",
        description: "Por favor ingresa los 6 dígitos del PIN",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Verificar el PIN
      const { data: pinData, error: pinError } = await supabase
        .from("verification_pins")
        .select("*")
        .eq("user_id", userId)
        .eq("pin", pin)
        .eq("verified", false)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (pinError || !pinData) {
        toast({
          title: "PIN inválido",
          description: "El PIN ingresado es incorrecto o ha expirado",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Marcar PIN como verificado
      const { error: updateError } = await supabase
        .from("verification_pins")
        .update({ verified: true, verified_at: new Date().toISOString() })
        .eq("id", pinData.id);

      if (updateError) throw updateError;

      // Marcar perfil como verificado
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ verified: true })
        .eq("id", userId);

      if (profileError) throw profileError;

      toast({
        title: "¡Verificación exitosa!",
        description: "Tu cuenta ha sido verificada correctamente",
      });

      navigate("/productos");
    } catch (error: any) {
      console.error("Error verifying PIN:", error);
      toast({
        title: "Error",
        description: "Ocurrió un error al verificar el PIN",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendPin = async () => {
    setResending(true);

    try {
      const { error } = await supabase.functions.invoke("send-verification-pin", {
        body: { email, userId },
      });

      if (error) throw error;

      toast({
        title: "PIN reenviado",
        description: "Se ha enviado un nuevo PIN a tu correo electrónico",
      });
    } catch (error: any) {
      console.error("Error resending PIN:", error);
      toast({
        title: "Error",
        description: "No se pudo reenviar el PIN",
        variant: "destructive",
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Verificación de cuenta</CardTitle>
          <CardDescription className="text-center">
            Ingresa el código de 6 dígitos que enviamos a {email}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={pin}
              onChange={(value) => setPin(value)}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <Button
            onClick={handleVerify}
            disabled={loading || pin.length !== 6}
            className="w-full"
          >
            {loading ? "Verificando..." : "Verificar"}
          </Button>

          <div className="text-center">
            <Button
              variant="link"
              onClick={handleResendPin}
              disabled={resending}
              className="text-sm"
            >
              {resending ? "Reenviando..." : "¿No recibiste el código? Reenviar"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
