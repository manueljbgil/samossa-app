import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

export default function Auth() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  if (user) {
    navigate("/");
  }

  return (
    <div className="mx-auto max-w-md">
      <Card className="p-6">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Sign in to Samosa Map
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Rate the city's best samosas across Lisbon
          </p>
        </div>

        <GoogleSignInButton />
      </Card>
    </div>
  );
}
