// app/api/posts/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  // lista solo publicados para público
  const { data, error } = await supabaseAdmin
    .from('posts')
    .select('*')
    .eq('published', true)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  // Creación / edición desde panel (requiere header Authorization: Bearer <superadmin_token>)
  const auth = req.headers.get('authorization') || '';
  if (!auth.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  // aquí validación del token si usas JWT en tu backend; como ejemplo simple permitimos continuar
  // parse body
  const body = await req.json();
  const { title, slug, content, excerpt, image_url, published } = body;

  const { data, error } = await supabaseAdmin.from('posts').insert([{
    title, slug, content, excerpt, image_url, published: !!published
  }]).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
