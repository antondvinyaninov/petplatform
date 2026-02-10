import { NextRequest, NextResponse } from 'next/server';

const ADMIN_API_URL = process.env.ADMIN_API_URL || 'http://localhost:9000';

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const cookies = request.headers.get('cookie') || '';
    const body = await request.json();
    
    const response = await fetch(`${ADMIN_API_URL}/api/admin/breeds/${params.id}`, {
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
    console.error('Breed update error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update breed' },
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
    
    const response = await fetch(`${ADMIN_API_URL}/api/admin/breeds/${params.id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies,
      },
    });

    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Breed delete error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete breed' },
      { status: 500 }
    );
  }
}
