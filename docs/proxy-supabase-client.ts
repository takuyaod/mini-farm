// app/src/lib/supabase/proxy.ts
//
// proxy.ts 内でのみ使用する Supabase クライアント。
// @supabase/ssr の createServerClient を使い、
// リクエスト・レスポンス双方の Cookie と Headers を正しく読み書きする。
//
// ⚠️ 注意：proxy.ts から返すレスポンスは必ず supabaseResponse を使うこと。
//    NextResponse.next() を新たに生成して返すと Cookie の更新が失われ、
//    ユーザーがランダムにログアウトされる原因になる。
//
// ⚠️ createServerClient と supabase.auth.getUser() の間にコードを挟まないこと。
//    セッションの不整合でデバッグが困難になる。

import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import type { Database } from "@/lib/database.types"; // supabase gen types で生成

export function createProxyClient(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, // 旧: NEXT_PUBLIC_SUPABASE_ANON_KEY
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        // setAll は (cookiesToSet, headers) の2引数を受け取る
        // headers を response に反映しないとセッションリフレッシュが壊れる
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value)
          );
        },
      },
    }
  );

  return { supabase, supabaseResponse };
}
