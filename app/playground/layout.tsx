import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Playground',
  description:
    'Interactive AI guardrail sandbox: test sensitive entity scanning, reversible AES-256-GCM vault tokenization, prompt injection defenses, and policy presets in real time.',
};

export default function PlaygroundLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
