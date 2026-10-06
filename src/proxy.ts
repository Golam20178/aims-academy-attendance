import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/supabase/database.types";
export async function proxy(request: NextRequest) {
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url || !key) return new NextResponse("Workspace configuration is missing.", {status:503});
 let response=NextResponse.next({request});
 const supabase=createServerClient<Database>(url,key,{cookies:{
 getAll:()=>request.cookies.getAll(),
 setAll(cookiesToSet, headers) {
 cookiesToSet.forEach(({name,value})=>request.cookies.set(name,value));
 response=NextResponse.next({request});
 cookiesToSet.forEach(({name,value,options})=>response.cookies.set(name,value,options));
 if(headers) Object.entries(headers).forEach(([name,value])=>response.headers.set(name,value));
 }
 }});
 const {data,error}=await supabase.auth.getUser();
 let approved=false;
 if(!error && data.user) {
 const result=await supabase.rpc("is_admin");
 approved=!result.error && result.data===true;
 }
 const login=request.nextUrl.pathname==="/login";
 if(!approved && !login) {
 const redirect=NextResponse.redirect(new URL("/login",request.url));
 response.cookies.getAll().forEach(c=>redirect.cookies.set(c));
 redirect.headers.set("Cache-Control","private, no-store");
 return redirect;
 }
 if(approved && login) {
 const redirect=NextResponse.redirect(new URL("/dashboard",request.url));
 response.cookies.getAll().forEach(c=>redirect.cookies.set(c));
 redirect.headers.set("Cache-Control","private, no-store");
 return redirect;
 }
 response.headers.set("Cache-Control","private, no-store");
 return response;
}
export const config={matcher:["/","/login","/dashboard/:path*","/students/:path*","/teachers/:path*","/attendance/:path*","/reports/:path*","/settings/:path*"]};
