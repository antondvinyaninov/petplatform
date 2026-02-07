import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const adminBackend = process.env.ADMIN_API_URL || 'http://localhost:9000';
  const cookies = request.headers.get('cookie') || '';
  
  console.log('📊 Stats API Route:');
  console.log('  Admin Backend:', adminBackend);
  console.log('  Cookies:', cookies);
  
  try {
    const url = `${adminBackend}/api/admin/moderation/stats`;
    console.log('  Fetching:', url);
    
    const response = await fetch(url, {
      headers: {
        'Cookie': cookies,
      },
    });
    
    console.log('  Response status:', response.status);
    const data = await response.json();
    console.log('  Response data:', data);
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('  Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch stats' }, { status: 500 });
  }
}
