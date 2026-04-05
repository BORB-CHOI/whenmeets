import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ id: string }>;
}

// /e/[id]/results → /e/[id] (통합 뷰로 리다이렉트)
export default async function ResultsPage({ params }: Props) {
  const { id } = await params;
  redirect(`/e/${id}`);
}
