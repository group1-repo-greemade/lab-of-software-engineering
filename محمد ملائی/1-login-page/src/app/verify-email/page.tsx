import { Suspense } from "react";
import VerifyEmailForm from "@/app/verify-email/verify-email-form";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<main className="page-shell" aria-busy="true" />}>
      <VerifyEmailForm />
    </Suspense>
  );
}
