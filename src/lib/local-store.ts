"use client";
import { useSyncExternalStore } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Database, databaseSchema, emptyDatabase } from "./academy";
import { createClient } from "./supabase/client";
type Snapshot={db:Database;authenticated:boolean;error:string|null;revision:number; saving:boolean};
let snapshot:Snapshot|null=null;
let started=false;
let generation=0;
const listeners=new Set<()=>void>();
function emit(){listeners.forEach(fn=>fn());}
function blank(error:string|null=null):Snapshot{return {db:emptyDatabase(),authenticated:false,error,revision:0,saving:false};}
async function load() {
 const ticket=++generation;
 try {
 const client=createClient();
 const {data,error}=await client.auth.getUser();
 if(ticket!==generation)return;
 if(error || !data.user) {snapshot=blank();emit();return;}
 const approved=await client.rpc("is_admin");
 if(approved.error || approved.data!==true) {snapshot=blank("This account does not have administrator access.");emit();return;}
 const result=await client.rpc("read_workspace");
 if(result.error)throw result.error;
 const workspace=z.object({db:databaseSchema,revision:z.number().int().nonnegative()}).parse(result.data);
 const db=workspace.db;
 if(ticket!==generation)return;
 snapshot={db,authenticated:true,error:null,revision:workspace.revision,saving:false};
 } catch {
 if(ticket!==generation)return;
 snapshot=blank("Could not connect to the academy workspace. Check your connection and try again.");
 }
 emit();
}
function subscribe(fn:()=>void) {
 listeners.add(fn);
 if(!started) {
 started=true;
 queueMicrotask(()=>{
 try {
 const client=createClient();
 client.auth.onAuthStateChange(()=>{setTimeout(()=>{if(!snapshot?.saving)void load();},0);});
 void load();
 }catch {snapshot=blank("Workspace configuration is missing.");emit();}
 });
 }
 const focus=()=>{if(!snapshot?.saving)void load();};
 window.addEventListener("focus",focus);
 return ()=>{listeners.delete(fn);window.removeEventListener("focus",focus);};
}
export function useAcademy(){return useSyncExternalStore(subscribe,()=>snapshot,()=>null);}
export async function saveDatabase(db:Database) {
 if(!snapshot?.authenticated || snapshot.error || snapshot.saving){toast.error("Wait for the workspace to finish loading or saving.");return false;}
 const previous=snapshot;
 snapshot={...snapshot,saving:true};emit();
 try {
 const parsed=databaseSchema.parse(db);
 const result=await createClient().rpc("save_workspace",{payload:parsed,expected_revision:previous.revision});
 if(result.error) {
 if(result.error.code==="40001") {await load();toast.error("Another administrator changed these records. Review the latest data and retry.");return false;}
 throw result.error;
 }
 snapshot={...previous,db:parsed,revision:Number(result.data),saving:false};emit();return true;
 }catch{
 snapshot={...previous,saving:false};emit();
 toast.error("The changes could not be saved. Check your connection and record values, then retry.");return false;
 }
}
export const restoreDatabase=saveDatabase;
export async function signIn(email:string,password:string):Promise<string|null> {
 try {
 const client=createClient();
 const result=await client.auth.signInWithPassword({email:email.trim(),password});
 if(result.error)return "Unable to sign in. Check your email and password.";
 const approved=await client.rpc("is_admin");
 if(approved.error || approved.data!==true){await client.auth.signOut();return "This account does not have administrator access.";}
 await load();
 return snapshot?.authenticated ? null : "Could not load the workspace. Try again.";
 }catch{return "Unable to connect. Please try again.";}
}
export async function signOut(){
 try {
 const {error}=await createClient().auth.signOut();
 if(error)throw error;
 generation++;snapshot=blank();emit();return true;
 }catch{toast.error("Sign out failed. Please try again.");return false;}
}
