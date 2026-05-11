import { useSearchParams } from "react-router-dom";
import { VerifyPin } from "@/components/VerifyPin";

export default function VerifyPinPage() {
  const [searchParams] = useSearchParams();
  const userId = searchParams.get("userId") || "";
  const email = searchParams.get("email") || "";

  return <VerifyPin userId={userId} email={email} />;
}
