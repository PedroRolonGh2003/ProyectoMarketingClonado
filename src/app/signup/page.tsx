import InviteGuard from "@/components/auth/InviteGuard";
import SignupForm from "@/components/auth/SignupForm";

interface SignupPageProps {
  searchParams?: { token?: string };
}

export default function SignupPage({ searchParams }: SignupPageProps) {
  const token = searchParams?.token;

  if (!token) {
    return (
      <div className="page-message">
        <h1>Acceso denegado</h1>
        <p>
          Necesitas un enlace privado de invitación para registrar un delegado.
        </p>
      </div>
    );
  }

  return (
    <InviteGuard token={token}>
      <SignupForm token={token} />
    </InviteGuard>
  );
}
