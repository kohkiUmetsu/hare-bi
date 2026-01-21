import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-server';
import { fetchAdRanking } from '@/lib/ad-ranking';

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectName = searchParams.get('projectName');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  if (!projectName || !startDate || !endDate) {
    return NextResponse.json({ error: 'missing_params' }, { status: 400 });
  }

  try {
    const rows = await fetchAdRanking({ projectName, startDate, endDate });
    return NextResponse.json({ rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'fetch_failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
