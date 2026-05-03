import { Layout } from "@/components/layout";
import { SignUp } from "@clerk/react";

export function SignUpPage() {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  
  return (
    <Layout>
      <div className="min-h-[80vh] flex items-center justify-center p-4 relative">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 blur-3xl">
          <div className="w-96 h-96 bg-primary rounded-full" />
        </div>
        <div className="relative z-10 shadow-[0_0_40px_rgba(0,255,255,0.15)] rounded-2xl">
          <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
        </div>
      </div>
    </Layout>
  );
}