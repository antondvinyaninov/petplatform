import { NextRequest, NextResponse } from 'next/server';

const ADMIN_API_URL = process.env.ADMIN_API_URL || 'http://localhost:9000';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const cookies = request.headers.get('cookie') || '';
    
    const response = await fetch(`${ADMIN_API_URL}/api/admin/pets/${params.id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies,
      },
    });

    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Pet fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch pet' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const cookies = request.headers.get('cookie') || '';
    const body = await request.json();
    
    const response = await fetch(`${ADMIN_API_URL}/api/admin/pets/${params.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Pet update error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update pet' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const cookies = request.headers.get('cookie') || '';
    
    const response = await fetch(`${ADMIN_API_URL}/api/admin/pets/${params.id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies,
      },
    });

    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Pet delete error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete pet' },
      { status: 500 }
    );
  }
}
