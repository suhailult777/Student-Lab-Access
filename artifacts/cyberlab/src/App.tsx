import { useEffect, useRef } from "react";
import { ClerkProvider, Show, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { dark } from "@clerk/themes";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { Home } from "@/pages/home";
import { Dashboard } from "@/pages/dashboard";
import { Labs } from "@/pages/labs";
import { LabDetail } from "@/pages/lab-detail";
import { Bookings } from "@/pages/bookings";
import { BookingDetail } from "@/pages/booking-detail";
import { Payment } from "@/pages/payment";
import { TerminalPage } from "@/pages/terminal";
import { SignInPage } from "@/pages/sign-in";
import { SignUpPage } from "@/pages/sign-up";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in environment");
}

const clerkAppearance = {
  baseTheme: dark,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(180 100% 40%)", // primary
    colorForeground: "hsl(180 100% 90%)", // foreground
    colorMutedForeground: "hsl(180 30% 60%)", // muted-foreground
    colorDanger: "hsl(0 100% 50%)", // destructive
    colorBackground: "hsl(240 10% 6%)", // card
    colorInput: "hsl(180 100% 15%)", // input
    colorInputForeground: "hsl(180 100% 90%)",
    colorNeutral: "hsl(180 100% 15%)", // border
    fontFamily: "'Space Grotesk', sans-serif",
    borderRadius: "0rem", // sharp corners for hacker theme
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-card border border-border w-[440px] max-w-full overflow-hidden shadow-none rounded-none",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-foreground font-mono uppercase tracking-widest",
    headerSubtitle: "text-muted-foreground font-mono",
    socialButtonsBlockButtonText: "text-foreground font-mono uppercase",
    formFieldLabel: "text-muted-foreground font-mono uppercase tracking-wider text-xs",
    footerActionLink: "text-primary hover:text-primary/80 font-mono uppercase",
    footerActionText: "text-muted-foreground font-mono",
    dividerText: "text-muted-foreground font-mono uppercase",
    identityPreviewEditButton: "text-primary hover:text-primary/80",
    formFieldSuccessText: "text-green-500 font-mono",
    alertText: "text-destructive font-mono",
    logoBox: "flex justify-center w-full",
    logoImage: "w-16 h-16 filter drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]",
    socialButtonsBlockButton: "border border-border hover:bg-muted/50 rounded-none transition-colors",
    formButtonPrimary: "bg-primary text-primary-foreground hover:bg-primary/90 font-mono font-bold uppercase rounded-none shadow-[0_0_15px_rgba(0,255,255,0.2)]",
    formFieldInput: "bg-background border border-border text-foreground rounded-none focus:ring-primary focus:border-primary font-mono",
    footerAction: "bg-background rounded-none",
    dividerLine: "bg-border",
    alert: "bg-destructive/10 border border-destructive rounded-none",
    otpCodeFieldInput: "bg-background border border-border text-foreground rounded-none font-mono",
    formFieldRow: "font-mono",
    main: "font-mono",
  },
};

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/dashboard" />
      </Show>
      <Show when="signed-out">
        <Home />
      </Show>
    </>
  );
}

function ProtectedRoute({ component: Component, ...rest }: any) {
  return (
    <Route {...rest}>
      {(params) => (
        <>
          <Show when="signed-in">
            <Component params={params} />
          </Show>
          <Show when="signed-out">
            <Redirect to="/sign-in" />
          </Show>
        </>
      )}
    </Route>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      <Route path="/labs" component={Labs} />
      <Route path="/labs/:id" component={LabDetail} />
      
      <ProtectedRoute path="/bookings" component={Bookings} />
      <ProtectedRoute path="/bookings/:id" component={BookingDetail} />
      <ProtectedRoute path="/payment/:bookingId" component={Payment} />
      <ProtectedRoute path="/terminal/:token" component={TerminalPage} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "AUTHENTICATE",
            subtitle: "Enter credentials to access the system",
          },
        },
        signUp: {
          start: {
            title: "INITIALIZE",
            subtitle: "Create a new operative profile",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}