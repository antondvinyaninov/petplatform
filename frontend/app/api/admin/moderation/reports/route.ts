import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get('status') || 'pending';
  
  const adminBackend = process.env.ADMIN_API_URL || 'http://localhost:9000';
  const cookies = request.headers.get('cookie') || '';
  
  console.log('📋 Reports API Route:');
  console.log('  Admin Backend:', adminBackend);
  console.log('  Status filter:', status);
  console.log('  All headers:', Object.fromEntries(request.headers.entries()));
  console.log('  Cookies string:', cookies);
  console.log('  Cookies length:', cookies.length);
  
  try {
    const url = `${adminBackend}/api/admin/moderation/reports?status=${status}`;
    console.log('  Fetching:', url);
    
    const response = await fetch(url, {
      headers: {
        'Cookie': cookies,
      },
    });
    
    console.log('  Response status:', response.status);
    const responseText = await response.text();
    console.log('  Response text:', responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { success: false, error: responseText };
    }
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('  Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch reports' }, { status: 500 });
  }
}
