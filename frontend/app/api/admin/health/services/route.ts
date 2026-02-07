import { NextRequest, NextResponse } from 'next/server';

const ADMIN_API_URL = process.env.ADMIN_API_URL || 'http://localhost:9000';

export async function GET(request: NextRequest) {
  try {
    const cookies = request.headers.get('cookie') || '';
    
    const response = await fetch(
      `${ADMIN_API_URL}/api/admin/health/services`,
      {
        headers: {
          Cookie: cookies,
        },
      }
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error fetching health services:', error);
    return NextResponse.json(
      { error: 'Failed to fetch health services' },
      { status: 500 }
    );
  }
}
