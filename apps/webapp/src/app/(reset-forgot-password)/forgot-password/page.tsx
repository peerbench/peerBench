"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle, Loader2, CheckCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "react-toastify";
import { errorMessage } from "@/utils/error-message";
import { sendResetEmail } from "./actions/send-reset-email";

const formSchema = yup.object({
  email: yup
    .string()
    .email("Please enter a valid email")
    .required("Email is required"),
});

type FormData = yup.InferType<typeof formSchema>;

export default function SendResetEmailForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: yupResolver(formSchema) });

  const onSubmit = async (formData: FormData) => {
    setIsLoading(true);

    try {
      const result = await sendResetEmail(formData.email);

      if (result?.error) {
        throw new Error(result.error);
      }
      setIsSuccess(true);
    } catch (error) {
      console.error(error);
      toast.error(`Something went wrong: ${errorMessage(error)}`, {
        closeOnClick: true,
        autoClose: false,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <Card className="shadow-2xl border-0 bg-card/95 backdrop-blur-sm">
          <CardHeader className="text-center pb-6">
            <motion.div
              className="flex justify-center mb-4"
              animate={{ scale: [0.8, 1.1, 1] }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <CheckCircle className="h-16 w-16 text-green-500" />
            </motion.div>
            <CardTitle className="text-2xl font-bold text-card-foreground">
              Check Your Email
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              We&apos;ve sent you a password reset link
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center text-sm text-muted-foreground">
              <p>
                We&apos;ve sent a password reset link to your email address.
                Please check your inbox and follow the instructions to reset
                your password.
              </p>
              <p className="mt-2">
                If you don&apos;t see the email, check your spam folder.
              </p>
            </div>

            <div className="space-y-3">
              <Link
                href="/login"
                className="block w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors duration-200 text-center"
              >
                Back to Login
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="w-full max-w-md"
    >
      <Card className="shadow-2xl border-0 bg-card/95 backdrop-blur-sm">
        <CardHeader className="text-center pb-6">
          <motion.div
            className="flex justify-center mb-4"
            animate={{ scale: [0.8, 1.1, 1] }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
              <svg
                className="h-8 w-8 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                />
              </svg>
            </div>
          </motion.div>
          <CardTitle className="text-2xl font-bold text-card-foreground">
            Forgot Password?
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Enter your email to reset your password
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 text-base font-semibold"
              variant="default"
              size="default"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin h-5 w-5 text-primary-foreground" />
                  Sending...
                </span>
              ) : (
                "Send Reset Link"
              )}
            </Button>
          </form>

          <div className="text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
