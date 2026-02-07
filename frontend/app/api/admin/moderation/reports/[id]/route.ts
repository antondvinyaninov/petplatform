import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const adminBackend = process.env.ADMIN_API_URL || 'http://localhost:9000';
  const cookies = request.headers.get('cookie') || '';
  const body = await request.json();
  
  try {
    const response = await fetch(`${adminBackend}/api/admin/moderation/reports/${params.id}`, {
      method: 'PUT',
      headers: {
        'Cookie': cookies,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update report' }, { status: 500 });
  }
}
