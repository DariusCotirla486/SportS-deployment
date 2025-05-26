import { NextResponse } from 'next/server';
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

// GET all categories
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('item_categories')
      .select('*')
      .order('name');

    if (error) throw error;

    return NextResponse.json(data, { headers: corsHeaders() });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch categories' },
      { status: 500, headers: corsHeaders() }
    );
  }
} 