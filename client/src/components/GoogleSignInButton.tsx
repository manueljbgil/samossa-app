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

    const getResponsiveWidth = () => {
      const viewportWidth = window.innerWidth;
      if (viewportWidth >= 1536) return 460; // 2xl
      if (viewportWidth >= 1280) return 420; // xl
      if (viewportWidth >= 1024) return 380; // lg
      if (viewportWidth >= 768) return 340; // md
      if (viewportWidth >= 640) return 300; // sm
      if (viewportWidth >= 380) return 280; // xs
      return 240; // default mobile
    };

    const renderGoogleButton = () => {
      if (!containerRef.current) return;
      const containerWidth = Math.floor(containerRef.current.clientWidth);
      const width = Math.min(
        containerWidth || getResponsiveWidth(),
        getResponsiveWidth(),
      );

      containerRef.current.replaceChildren();
      window.google.accounts.id.renderButton(containerRef.current, {
        type: "standard",
        size: "large",
        text: "signin_with",
        locale: "en",
        width,
      });
    };

    renderGoogleButton();

    const observer = new ResizeObserver(() => {
      renderGoogleButton();
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  async function handleCredentialResponse(response: any) {
    try {
      if (!response.credential) {
        throw new Error("No credential received");
      }
      await googleLogin(response.credential);
      navigate("/");
    } catch (err) {
      toast({
        title: "Google sign-in failed",
        description: String(err),
        variant: "destructive",
      });
    }
  }

  return (
    <div
      ref={containerRef}
      className="mx-auto w-full max-w-[15rem] xs:max-w-[17.5rem] sm:max-w-[18.75rem] md:max-w-[21.25rem] lg:max-w-[23.75rem] xl:max-w-[26.25rem] 2xl:max-w-[28.75rem]"
    />
  );
}
