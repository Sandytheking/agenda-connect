// app/api/uploads/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const POST = async (req: Request) => {
  const form = await req.formData();
  const file = form.get('file') as Blob | null;
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

  const filename = `${Date.now()}_${(form.get('filename') as string) || 'upload'}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { data, error } = await supabaseAdmin.storage.from('posts').upload(filename, buffer, {
    contentType: file.type || 'application/octet-stream',
    upsert: false,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const publicURL = supabaseAdmin.storage.from('posts').getPublicUrl(data.path).publicURL;
  return NextResponse.json({ url: publicURL });
};
