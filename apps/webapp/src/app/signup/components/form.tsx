"use client";

import { useState } from "react";
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
import {
  LucideAlertCircle,
  LucideLoader2,
  LucideCheckCircle,
} from "lucide-react";
import { signUp } from "../actions/signup";
import { useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import { errorMessage } from "@/utils/error-message";
import Image from "next/image";
import Link from "next/link";
import * as yup from "yup";

const signupSchema = yup.object({
  email: yup
    .string()
    .email("Please enter a valid email")
    .required("Email is required"),
  password: yup
    .string()
    .min(6, "Password must be at least 6 characters")
    .required("Password is required"),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref("password")], "Passwords must match")
    .required("Password confirmation is required"),
});

type SignupFormData = yup.InferType<typeof signupSchema>;

export default function Form() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const searchParams = useSearchParams();
  const invitationCode = searchParams.get("invitation");
  const referralCode = searchParams.get("referral");
  const redirectPath = searchParams.get("redirect");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: yupResolver(signupSchema),
  });

  const onSubmit = async (formData: SignupFormData) => {
    setIsLoading(true);
    setIsSuccess(false);

    try {
      const result = await signUp(formData.email, formData.password, {
        invitationCode: invitationCode || undefined,
        referralCode: referralCode || undefined,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      setIsSuccess(true);
    } catch (error) {
      console.error(error);
      toast.error(`Something went wrong: ${errorMessage(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <Card className="shadow-2xl border-0 bg-card/95 backdrop-blur-sm">
        <CardHeader className="text-center pb-6">
          <motion.div
            className="flex justify-center mb-4"
            animate={{
              scale: isLoading ? 0.9 : 1,
              opacity: isLoading ? 0.7 : 1,
            }}
            transition={{ duration: 0.3 }}
          >
            <Image
              src="/logo-gradient.svg"
              alt="PeerBench Logo"
              width={120}
              height={40}
              className="h-12 w-auto"
              priority
            />
          </motion.div>
          <motion.div
            animate={{
              y: isLoading ? -10 : 0,
              opacity: isLoading ? 0.8 : 1,
            }}
            transition={{ duration: 0.3 }}
          >
            <CardTitle className="text-3xl font-bold text-card-foreground">
              {isSuccess ? "Account Created!" : "Create Account"}
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground mt-2">
              {isSuccess
                ? "Welcome to peerBench"
                : "Create an account to accept the invitation"}
            </CardDescription>
          </motion.div>
        </CardHeader>

        <CardContent className="space-y-6">
          {isSuccess ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-center space-y-6"
            >
              <div className="flex justify-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center"
                >
                  <LucideCheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                </motion.div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-card-foreground">
                  Account Created Successfully!
                </h3>
                <p className="text-muted-foreground">
                  Your account has been created. Please check your email for the
                  verification link.
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  asChild
                  className="w-full h-12 text-base font-semibold"
                  variant="default"
                  size="default"
                >
                  <Link
                    href={`/login${redirectPath ? `?redirect=${encodeURIComponent(redirectPath)}` : invitationCode ? `?invitation=${invitationCode}` : ""}`}
                  >
                    Sign In to Your Account
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="w-full h-12 text-base font-semibold"
                >
                  <Link href="/">Go to Homepage</Link>
                </Button>
              </div>
            </motion.div>
          ) : (
            <>
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
                      <LucideAlertCircle className="w-4 h-4" />
                      {errors.email.message}
                    </motion.p>
                  )}
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="password"
                    className="block text-sm font-semibold text-card-foreground"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={"password"}
                      autoComplete="new-password"
                      {...register("password")}
                      placeholder="Create a password"
                      className="h-11 text-base pr-10"
                      tabIndex={2}
                    />
                  </div>
                  {errors.password && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm text-destructive flex items-center gap-1"
                    >
                      <LucideAlertCircle className="w-4 h-4" />
                      {errors.password.message}
                    </motion.p>
                  )}
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-semibold text-card-foreground"
                  >
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={"password"}
                      autoComplete="new-password"
                      {...register("confirmPassword")}
                      placeholder="Confirm your password"
                      className="h-11 text-base pr-10"
                      tabIndex={3}
                    />
                  </div>
                  {errors.confirmPassword && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm text-destructive flex items-center gap-1"
                    >
                      <LucideAlertCircle className="w-4 h-4" />
                      {errors.confirmPassword.message}
                    </motion.p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 text-base font-semibold"
                  variant="default"
                  size="default"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <LucideLoader2 className="animate-spin h-5 w-5 text-primary-foreground" />
                      Creating account...
                    </span>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link
                    href={`/login${redirectPath ? `?redirect=${encodeURIComponent(redirectPath)}` : invitationCode ? `?invitation=${invitationCode}` : ""}`}
                    className="font-medium text-primary hover:text-primary/80 transition-colors duration-200"
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
