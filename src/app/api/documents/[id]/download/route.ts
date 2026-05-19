import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Returns a 60-second signed URL for a stored file. The RLS on
 * project_documents (and storage.objects) already gates access — we just
 * have to look up the storage path for this document id and ask Storage
 * for a signed URL.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();

  const { data: doc, error } = await supabase
    .from("project_documents")
    .select("storage_path, name")
    .eq("id", id)
    .maybeSingle();

  if (error || !doc?.storage_path) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: signed, error: signedError } = await supabase.storage
    .from("project-documents")
    .createSignedUrl(doc.storage_path, 60);

  if (signedError || !signed?.signedUrl) {
    return NextResponse.json(
      { error: "Could not sign URL" },
      { status: 500 },
    );
  }

  return NextResponse.redirect(signed.signedUrl);
}
