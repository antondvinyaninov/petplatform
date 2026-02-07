import { NextRequest, NextResponse } from 'next/server';

const ADMIN_API_URL = process.env.ADMIN_API_URL || 'http://localhost:9000';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get('limit') || '200';
    
    const cookies = request.headers.get('cookie') || '';
    
    console.log('👥 Fetching user activity from backend...');
    
    const response = await fetch(
      `${ADMIN_API_URL}/api/admin/user-activity?limit=${limit}`,
      {
        headers: {
          Cookie: cookies,
        },
      }
    );

    console.log('👥 Backend response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('👥 Backend error:', errorText);
      return NextResponse.json(
        { error: errorText || 'Failed to fetch user activity' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('👥 User activity fetched successfully');
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('👥 Error fetching user activity:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user activity', details: String(error) },
      { status: 500 }
    );
  }
}
