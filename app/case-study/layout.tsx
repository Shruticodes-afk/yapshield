import type { Metadata } from 'next';
import { caseStudyContent } from '../../lib/caseStudyContent';

export const metadata: Metadata = {
  title: caseStudyContent.metadata.title,
  description: caseStudyContent.metadata.description,
};

export default function CaseStudyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
