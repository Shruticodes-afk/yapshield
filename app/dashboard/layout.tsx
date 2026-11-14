import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Audit Dashboard',
  description:
    'SHA-256 audit log dashboard, real-time integrity verification, risk telemetry, and compliance monitoring for YapShield.',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
