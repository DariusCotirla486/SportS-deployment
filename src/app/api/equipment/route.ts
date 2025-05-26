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

// GET all equipment
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('items')
      .select(`
        *,
        item_categories(name),
        item_stock(quantity)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const items = data.map(item => ({
      ...item,
      category_name: item.item_categories?.name,
      quantity: item.item_stock?.[0]?.quantity || 0
    }));

    return NextResponse.json(items, { headers: corsHeaders() });
  } catch (error) {
    console.error('Error fetching items:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch items' },
      { status: 500, headers: corsHeaders() }
    );
  }
}

// POST new equipment
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    console.log('Received data:', data);
    
    // Remove computed fields and id from insert data
    const { category_name, quantity, id, created_at, updated_at, ...dataToInsert } = data;
    console.log('Data to insert:', dataToInsert);

    // Validate category_id
    if (!dataToInsert.category_id) {
      console.log('Missing category_id');
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400, headers: corsHeaders() }
      );
    }

    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dataToInsert.category_id)) {
      console.log('Invalid category_id format:', dataToInsert.category_id);
      return NextResponse.json(
        { error: 'Invalid category ID format' },
        { status: 400, headers: corsHeaders() }
      );
    }

    // Ensure all required fields are present
    const requiredFields = ['name', 'brand', 'price', 'description', 'condition', 'category_id'];
    const missingFields = requiredFields.filter(field => !dataToInsert[field]);
    
    if (missingFields.length > 0) {
      console.log('Missing required fields:', missingFields);
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400, headers: corsHeaders() }
      );
    }

    const { data: newItem, error } = await supabase
      .from('items')
      .insert([dataToInsert])
      .select(`
        *,
        item_categories(name),
        item_stock(quantity)
      `)
      .single();

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    // Initialize stock
    await supabase
      .from('item_stock')
      .insert([{ item_id: newItem.id, quantity: 0 }]);

    // Format the response to include computed fields
    const formattedItem = {
      ...newItem,
      category_name: newItem.item_categories?.name,
      quantity: 0 // Initial quantity is 0
    };

    return NextResponse.json(formattedItem, { headers: corsHeaders() });
  } catch (error) {
    console.error('Error adding item:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add item' },
      { status: 500, headers: corsHeaders() }
    );
  }
}

// PUT (update) equipment by ID
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { error: 'ID is required (query parameter)' },
        { status: 400, headers: corsHeaders() }
      );
    }
    const updateData = await request.json();

    // Remove computed fields from update data
    const { category_name, quantity, ...dataToUpdate } = updateData;

    const { data, error } = await supabase
      .from('items')
      .update(dataToUpdate)
      .eq('id', id)
      .select(`
        *,
        item_categories(name),
        item_stock(quantity)
      `)
      .single();

    if (error) throw error;

    // Format the response to include computed fields
    const formattedItem = {
      ...data,
      category_name: data.item_categories?.name,
      quantity: data.item_stock?.[0]?.quantity || 0
    };

    return NextResponse.json(formattedItem, { headers: corsHeaders() });
  } catch (error) {
    console.error('Error updating item:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update item' },
      { status: 500, headers: corsHeaders() }
    );
  }
}

// DELETE equipment by ID
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400, headers: corsHeaders() }
      );
    }

    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true }, { headers: corsHeaders() });
  } catch (error) {
    console.error('Error deleting item:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete item' },
      { status: 500, headers: corsHeaders() }
    );
  }
} 