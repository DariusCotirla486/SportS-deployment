import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Helper function to add CORS headers
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders() });
}

// POST filter equipment
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    console.log('Received filter request:', data);

    if (!data || typeof data !== 'object') {
      throw new Error('Invalid request body');
    }

    let query = supabase
      .from('items')
      .select(`
        *,
        item_categories(name),
        item_stock(quantity)
      `);

    if (data.category_id) {
      query = query.eq('category_id', data.category_id);
    }

    if (data.sort_by === 'price') {
      query = query.order('price', { ascending: data.sort_order === 'asc' });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data: items, error } = await query;

    if (error) throw error;

    const formattedItems = items.map(item => ({
      ...item,
      category_name: item.item_categories?.name,
      quantity: item.item_stock?.[0]?.quantity || 0
    }));

    return NextResponse.json(formattedItems, { headers: corsHeaders() });
  } catch (error) {
    console.error('Error filtering items:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to filter items' },
      { status: 500, headers: corsHeaders() }
    );
  }
} 