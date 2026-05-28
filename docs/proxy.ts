// app/proxy.ts
//
// Next.js 16 では middleware.ts → proxy.ts にリネームされ、
// エクスポートする関数名も middleware → proxy に変わった。
//
// 役割：
//   1. Supabase のセッション Cookie をリフレッシュする
//   2. 未認証ユーザーを /login にリダイレクトする
//   3. 認証済みユーザーが /login にアクセスした場合は / にリダイレクトする
//
// ⚠️ セキュリティ上の注意：
//   proxy.ts はネットワーク境界であり認可システムではない。
//   Server Actions・Server Components でも個別にセッションを
//   再検証すること（proxy だけでは Server Actions は保護されない）。
//
// getClaims() について：
//   ローカルJWT検証のみで動作し、Auth サーバーへのネットワーク呼び出しが不要。
//   Cookie リフレッシュと存在確認が目的の proxy.ts では getClaims() が適切。
//   強制ログアウトやアカウント削除の即時検知が必要なデータ変更操作では
//   Server Actions 内で getUser() を使用すること。

import { type NextRequest, NextResponse } from "next/server";
import { createProxyClient } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ⚠️ createProxyClient と supabase.auth.getClaims() の間にコードを挟まないこと
  const { supabase, supabaseResponse } = createProxyClient(request);

  // getClaims() でセッションのリフレッシュを行う。
  // ローカルJWT検証のみで Auth サーバーへのネットワーク呼び出しが不要。
  // auth.getSession() はローカル Cookie のみ参照し署名検証を行わないためここでは使用しない。
  const {
    data: { claims },
  } = await supabase.auth.getClaims();

  // 未認証 → /login・/auth 以外へのアクセスを /login にリダイレクト
  if (
    !claims &&
    !pathname.startsWith("/login") &&
    !pathname.startsWith("/auth")
  ) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  // 認証済み → /login へのアクセスを / にリダイレクト
  if (claims && pathname === "/login") {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    return NextResponse.redirect(homeUrl);
  }

  // ⚠️ supabaseResponse をそのまま返すこと。
  //    新たに NextResponse.next() を生成して返すと Cookie が失われる。
  //    どうしても新しい Response が必要な場合は以下を守ること：
  //      1. const res = NextResponse.next({ request })
  //      2. supabaseResponse.cookies.getAll() をすべて res.cookies にコピー
  //      3. Cookie を変更しないまま return res
  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * 以下を除くすべてのリクエストにマッチ:
     *   - _next/static  （静的ファイル）
     *   - _next/image   （画像最適化）
     *   - favicon.ico
     *   - 拡張子付きファイル（.svg / .png / .jpg 等）
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
