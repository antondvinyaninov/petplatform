import { NextRequest, NextResponse } from 'next/server';

const ADMIN_API_URL = process.env.ADMIN_API_URL || 'http://localhost:9000';

export async function GET(request: NextRequest) {
  try {
    const cookies = request.headers.get('cookie') || '';
    
    console.log('📊 Fetching log stats from backend...');
    
    const response = await fetch(
      `${ADMIN_API_URL}/api/admin/logs/stats`,
      {
        headers: {
          Cookie: cookies,
        },
      }
    );

    console.log('📊 Backend response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('📊 Backend error:', errorText);
      return NextResponse.json(
        { error: errorText || 'Failed to fetch log stats' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('📊 Log stats fetched successfully');
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('📊 Error fetching log stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch log stats', details: String(error) },
      { status: 500 }
    );
  }
}
