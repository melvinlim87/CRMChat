// The login route needs its own minimal layout (no app sidebar).
export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
