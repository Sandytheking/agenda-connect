// app/blog/[slug]/page.tsx (server)
import { supabase } from '@/lib/supabaseClient';

export default async function PostPage({ params }: { params: { slug: string } }) {
  const slug = params.slug;
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/posts?slug=${slug}`);
  // alternativamente puedes crear endpoint GET /api/posts?slug=xxx
  // para simplificar usaremos direct query to supabase via SUPABASE anon client isn't ideal on server;
  // here's a simple fetch approach using existing public endpoint (you can implement GET by slug)
  const posts = await res.json();
  const post = Array.isArray(posts) ? posts.find((p:any) => p.slug === slug) : (posts || null);

  if (!post) return (<main className="max-w-3xl mx-auto py-12 px-4"><p>Artículo no encontrado</p></main>);

  return (
    <main className="max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-4">{post.title}</h1>
      <p className="text-sm text-gray-500 mb-6">Publicado el {new Date(post.created_at).toLocaleDateString()}</p>
      {post.image_url && <img src={post.image_url} alt={post.title} className="w-full h-64 object-cover rounded mb-6" />}
      <article className="prose max-w-none" dangerouslySetInnerHTML={{ __html: post.content }} />
    </main>
  );
}
