"use client";
import { useEffect, useState, ReactNode, FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  CalendarCheck,
  ChartColumn,
  Settings,
  LogOut,
  ShieldCheck,
  ArrowRight,
  LoaderCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useAcademy, signIn, signOut } from "@/lib/local-store";
import {
  Dashboard,
  People,
  AttendancePage,
  Profile,
  Reports,
  SettingsPage,
} from "./views";
const nav = [
  { path: "dashboard", label: "Overview", icon: LayoutDashboard },
  { path: "students", label: "Students", icon: GraduationCap },
  { path: "teachers", label: "Teachers", icon: Users },
  { path: "attendance", label: "Attendance", icon: CalendarCheck },
  { path: "reports", label: "Reports", icon: ChartColumn },
  { path: "settings", label: "Settings", icon: Settings },
];
export function Portal({ page, id }: { page: string; id?: string }) {
  const state = useAcademy();
  const router = useRouter();
  useEffect(() => {
    if (state && !state.authenticated && page !== "login")
      router.replace("/login");
    if (state?.authenticated && page === "login") router.replace("/dashboard");
  }, [state, page, router]);
  if (
    !state ||
    (!state.authenticated && page !== "login") ||
    (state.authenticated && page === "login")
  )
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-muted-foreground">
        <LoaderCircle className="size-5 animate-spin" /> Loading AIMS Academy…
      </div>
    );
  if (page === "login") return <Login connectionError={state.error} />;
  const title = nav.find((n) => n.path === page)?.label ?? "Student profile";
  let content: ReactNode;
  switch (page) {
    case "dashboard":
      content = <Dashboard db={state.db} />;
      break;
    case "students":
      content = <People kind="students" db={state.db} />;
      break;
    case "teachers":
      content = <People kind="teachers" db={state.db} />;
      break;
    case "attendance":
      content = <AttendancePage db={state.db} />;
      break;
    case "profile":
      content = <Profile db={state.db} id={id ?? ""} />;
      break;
    case "reports":
      content = <Reports db={state.db} />;
      break;
    default:
      content = <SettingsPage db={state.db} />;
  }
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="p-5">
          <Link href="/dashboard" aria-label="AIMS Academy home">
            <Image
              loading="eager" src="/logo.jpg"
              alt="AIMS Academy"
              width={200}
              height={44}
              priority
              className="h-auto w-full rounded bg-white p-1"
            />
          </Link>
          <p className="mt-2 text-xs text-muted-foreground">
            Attendance & academy management
          </p>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>WORKSPACE</SidebarGroupLabel>
            <SidebarMenu>
              {nav.map((n) => (
                <SidebarMenuItem key={n.path}>
                  <SidebarMenuButton
                    render={<Link href={`/${n.path}`} />}
                    isActive={
                      page === n.path ||
                      (page === "profile" && n.path === "students")
                    }
                  >
                    <n.icon />
                    <span>{n.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="p-4">
          <div className="rounded-xl border bg-background p-3 text-xs text-muted-foreground">
            <Badge variant="secondary" className="mb-2">
              Connected workspace
            </Badge>
            <p>Records are shared securely through your academy database.</p>
          </div>
          <SidebarMenuButton
            onClick={async () => {
              if (await signOut()) router.replace("/login");
            }}
          >
            <LogOut />
            <span>Sign out</span>
          </SidebarMenuButton>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-16 items-center justify-between border-b bg-card px-4 md:px-8">
          <div className="flex items-center gap-3">
            <SidebarTrigger />
            <span className="text-sm font-medium">{title}</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <ShieldCheck className="size-4 text-primary" />
            <span>Academy Admin</span>
            <Badge variant="outline">Admin</Badge>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-8">
          {state.error && (
            <Alert variant="destructive">
              <AlertTitle>Storage needs attention</AlertTitle>
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          <fieldset disabled={state.saving} className="min-w-0 space-y-6">{content}</fieldset>
          <footer className="border-t pt-5 text-xs text-muted-foreground">
            AIMS Academy · Attendance Portal
          </footer>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
function Login({ connectionError }: { connectionError: string | null }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (busy) return;
    setBusy(true);
    setError("");
    const message = await signIn(String(f.get("email")), String(f.get("password")));
    setBusy(false);
    if (message) setError(message);
    else { router.replace("/dashboard"); router.refresh(); }
  }
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-primary p-12 text-primary-foreground lg:flex">
        <Image
          loading="eager" src="/logo.jpg"
          alt="AIMS Academy"
          width={260}
          height={57}
          className="rounded-lg bg-white p-3"
        />
        <div>
          <Badge className="mb-5 bg-white/15 text-white">AIMS ACADEMY</Badge>
          <h1 className="max-w-lg text-5xl font-semibold leading-tight">
            Every student.
            <br />
            Every class.
            <br />
            Every step forward.
          </h1>
          <p className="mt-6 max-w-md text-lg text-white/75">
            A simpler way to manage your academy and keep track of the learning
            journey.
          </p>
          <div className="mt-10 flex gap-6 text-sm text-white/80">
            <span>Students & teachers</span>
            <span>Attendance & insights</span>
          </div>
        </div>
        <p className="text-xs text-white/60">Your academy, connected.</p>
      </section>
      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          <Image
            loading="eager" src="/logo.jpg"
            alt="AIMS Academy"
            width={200}
            height={44}
            className="lg:hidden"
          />
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Welcome back</CardTitle>
              <CardDescription>
                Sign in to your academy workspace.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={submit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">Admin email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    placeholder="Enter your email"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                  />
                </div>
                {(error || connectionError) && (
                  <p role="alert" className="text-sm text-destructive">
                    {error || connectionError}
                  </p>
                )}
                <Button type="submit" className="w-full" size="lg" disabled={busy}>
                  {busy ? "Signing in…" : "Sign in"} <ArrowRight />
                </Button>
              </form>
            </CardContent>
          </Card>

        </div>
      </section>
    </main>
  );
}
