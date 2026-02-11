import { NextRequest, NextResponse } from 'next/server';

const ADMIN_API_URL = process.env.ADMIN_API_URL || 'http://localhost:9000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const response = await fetch(`${ADMIN_API_URL}/api/admin/pets/${id}/changelog`, {
      headers: {
        'Cookie': request.headers.get('cookie') || '',
      },
      credentials: 'include',
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch changelog' },
      { status: 500 }
    );
  }
}
