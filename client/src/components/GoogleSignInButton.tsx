import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (element: HTMLElement, config: any) => void;
        };
      };
    };
  }
}

export function GoogleSignInButton() {
  const { googleLogin } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.google) {
      console.error("Google Sign-In library not loaded");
      return;
    }

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.error("VITE_GOOGLE_CLIENT_ID not configured");
      return;
    }

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleCredentialResponse,
    });

    if (containerRef.current) {
      window.google.accounts.id.renderButton(containerRef.current, {
        type: "standard",
        size: "large",
        text: "signin_with",
        locale: "en",
      });
    }
  }, []);

  async function handleCredentialResponse(response: any) {
    try {
      if (!response.credential) {
        throw new Error("No credential received");
      }
      await googleLogin(response.credential);
      toast({ title: "Welcome!" });
      navigate("/");
    } catch (err) {
      toast({
        title: "Google sign-in failed",
        description: String(err),
        variant: "destructive",
      });
    }
  }

  return <div ref={containerRef}></div>;
}
