import ErrorForm from "./components/error-form";
import ResetPasswordForm from "./components/reset-password-form";

type PageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function Page({ searchParams }: PageProps) {
  const { error } = await searchParams;

  // If the error query param is present, likely user is redirected from
  // password reset endpoint with an error. In this case check the logs for more info.
  if (error) {
    return <ErrorForm />;
  }

  return <ResetPasswordForm />;
}
