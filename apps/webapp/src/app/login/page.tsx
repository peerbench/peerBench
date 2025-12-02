"use client";

import { useState, useTransition } from "react";
import { motion } from "motion/react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle, Loader2 } from "lucide-react";
import { signIn } from "@/lib/actions/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { useSettingOpenRouterKey } from "@/lib/hooks/settings/use-setting-openrouter-key";
import { useQueryClient } from "@tanstack/react-query";
import { useOpenRouterServerKey } from "@/lib/react-query/use-openrouter-server-key";
import Image from "next/image";
import Link from "next/link";
import * as yup from "yup";

const loginSchema = yup.object({
  email: yup
    .string()
    .email("Please enter a valid email")
    .required("Email is required"),
  password: yup
    .string()
    .min(6, "Password must be at least 6 characters")
    .required("Password is required"),
});

type LoginFormData = yup.InferType<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [openRouterApiKey, setOpenRouterApiKey] = useSettingOpenRouterKey();
  const { refetch: getOpenRouterServerKey } = useOpenRouterServerKey(false);
  const invitationCode = searchParams.get("invitation");
  const redirectPath = searchParams.get("redirect");
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: yupResolver(loginSchema),
  });

  const onSubmit = async (formData: LoginFormData) => {
    setIsLoading(true);
    setError("");

    try {
      const form = new FormData();
      form.append("email", formData.email);
      form.append("password", formData.password);

      const result = await signIn(form);

      if (result?.error) {
        console.error("Login error:", result.error);
        setError(result.error);
        return;
      }

      // Invalidate all the cached queries
      queryClient.invalidateQueries();

      // If user doesn't have an API key settled, try to get one from the server
      if (!openRouterApiKey) {
        const apiKey = await getOpenRouterServerKey();
        if (apiKey.data !== undefined) {
          setOpenRouterApiKey(apiKey.data);
        }
      }

      startTransition(() => {
        if (invitationCode) {
          router.push(`/benchmarks/invite/${encodeURI(invitationCode)}`);
        } else if (redirectPath) {
          // Redirect to the original page they were trying to access
          router.push(redirectPath);
        } else {
          router.push("/");
        }
      });
    } catch (error) {
      console.error("Login error:", error);
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="h-[calc(100vh-100px)] flex items-center justify-center p-4 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
        }}
        transition={{
          duration: 0.6,
          ease: "easeOut",
        }}
        className="w-full max-w-md"
      >
        <Card className="shadow-2xl border-0 bg-card/95 backdrop-blur-sm">
          <CardHeader className="text-center pb-6">
            <div className="flex justify-center mb-4">
              <Image
                src="/logo-gradient.svg"
                alt="PeerBench Logo"
                width={120}
                height={40}
                className="h-12 w-auto"
                priority
              />
            </div>
            <div>
              <CardTitle className="text-3xl font-bold text-card-foreground">
                Welcome Back
              </CardTitle>
              <CardDescription className="text-base text-muted-foreground mt-2">
                Sign in to your peerBench account
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="block text-sm font-semibold text-card-foreground"
                >
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  {...register("email")}
                  placeholder="Enter your email"
                  className="h-11 text-base"
                  tabIndex={1}
                />
                {errors.email && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-destructive flex items-center gap-1"
                  >
                    <AlertCircle className="w-4 h-4" />
                    {errors.email.message}
                  </motion.p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="block text-sm font-semibold text-card-foreground"
                  >
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-sm text-primary hover:text-primary/80 transition-colors duration-200"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  {...register("password")}
                  placeholder="Enter your password"
                  className="h-11 text-base"
                  tabIndex={2}
                />
                {errors.password && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-destructive flex items-center gap-1"
                  >
                    <AlertCircle className="w-4 h-4" />
                    {errors.password.message}
                  </motion.p>
                )}
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-destructive text-sm text-center flex items-center justify-center gap-2"
                >
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </motion.div>
              )}

              <Button
                type="submit"
                disabled={isLoading || isPending}
                className="w-full h-12 text-base font-semibold"
                variant="default"
                size="default"
              >
                {isLoading || isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="animate-spin h-5 w-5 text-primary-foreground" />
                    Signing in...
                  </span>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            <div className="text-center pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link
                  href={`/signup${redirectPath ? `?redirect=${encodeURIComponent(redirectPath)}` : ""}`}
                  className="text-primary hover:text-primary/80 font-semibold transition-colors duration-200"
                >
                  Sign up
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </main>
  );
}
