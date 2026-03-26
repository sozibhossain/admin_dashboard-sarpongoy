"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  LayoutDashboard,
  Menu,
  School,
  ShieldUser,
  UsersRound,
  X,
  LogOut,
  User,
} from "lucide-react";
import { fetchAdminProfile, logoutAdmin } from "@/lib/api";
import { cn } from "@/lib/cn";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Image from "next/image";

interface DashboardShellProps {
  children: React.ReactNode;
}

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/students",
    label: "Student Management",
    icon: ShieldUser,
  },
  {
    href: "/teachers",
    label: "Teacher Management",
    icon: UsersRound,
  },
  {
    href: "/schools",
    label: "School Management",
    icon: School,
  },
  {
    href: "/profile",
    label: "Profile",
    icon: User,
  },
];

function SidebarNav({
  onNavigate,
  onLogout,
}: {
  onNavigate?: () => void;
  onLogout: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className="px-6 pt-6 flex items-center justify-center">
        <Image
          src="/logo.png"
          alt="Logo"
          width={1000}
          height={1000}
          className="h-[102px] w-[130px]"
        />
      </div>
      <nav className="mt-10 flex flex-1 flex-col gap-4 px-4">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex h-12 items-center gap-3 rounded-lg border px-3 text-[16px] font-normal leading-[120%] transition-colors",
                isActive
                  ? "border-transparent bg-[linear-gradient(180deg,#00B023_0%,#077A1E_91.46%)] text-white"
                  : "border-[#34b56a] text-[#079938] hover:bg-[#ebf9ee]",
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="px-4 pb-6 pt-4">
        <Button
          variant="danger"
          onClick={onLogout}
          className="h-12 w-full gap-2 text-[16px]"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </Button>
      </div>
    </div>
  );
}

export function DashboardShell({ children }: DashboardShellProps) {
  const { data: session } = useSession();
  const { data: profile } = useQuery({
    queryKey: ["profile", "header"],
    queryFn: fetchAdminProfile,
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const userName = useMemo(() => {
    if (session?.user?.name) return session.user.name;
    if (session?.user?.email) return session.user.email.split("@")[0];
    return "Admin";
  }, [session?.user?.name, session?.user?.email]);

  const initials = useMemo(() => {
    const parts = userName.split(" ").filter(Boolean);
    return (
      parts
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join("") || "AD"
    );
  }, [userName]);

  const profileImage = profile?.profile?.url || session?.user?.image || "";

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logoutAdmin({ refreshToken: session?.refreshToken });
    } catch {
      // local session should still be cleared
    } finally {
      await signOut({ callbackUrl: "/login" });
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-[#f2f7e8]">
        <aside className="fixed inset-y-0 left-0 hidden w-[290px] border-r border-[#dde4d2] bg-white lg:block">
          <SidebarNav onLogout={() => setLogoutOpen(true)} />
        </aside>

        {sidebarOpen ? (
          <div className="fixed inset-0 z-50 bg-black/50 lg:hidden">
            <div className="h-full w-[290px] bg-white">
              <div className="flex items-center justify-end px-4 pt-4">
                <button
                  type="button"
                  className="rounded-md p-2 text-[#333] hover:bg-[#f1f1f1]"
                  onClick={() => setSidebarOpen(false)}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <SidebarNav
                onNavigate={() => setSidebarOpen(false)}
                onLogout={() => {
                  setSidebarOpen(false);
                  setLogoutOpen(true);
                }}
              />
            </div>
          </div>
        ) : null}

        <div className="lg:ml-[290px]">
          <header className="sticky top-0 z-40 border-b border-[#dde4d2] bg-white">
            <div className="flex h-[86px] items-center justify-between px-4 sm:px-8">
              <button
                type="button"
                className="rounded-md border border-[#d5dacd] p-2 text-[#2e2e2e] lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="hidden lg:block" />
              <div className="ml-auto flex items-center gap-3">
                <Link
                  href="/profile"
                  className="text-[16px] font-medium text-[#2b2b2b]"
                >
                  {userName}
                </Link>
                <Avatar>
                  <AvatarImage src={profileImage} alt={userName} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              </div>
            </div>
          </header>
          <main className="p-3 sm:p-5 lg:p-6">{children}</main>
        </div>
      </div>

      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent className="max-w-[620px] rounded-2xl p-8">
          <DialogHeader>
            <DialogTitle className="text-center text-[24px] font-semibold mb-2">
              Are you sure want to Log out?
            </DialogTitle>
            <DialogDescription className="text-center text-[16px]">
              Tap log out from the dashboard.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-2">
            <Button
              variant="danger"
              onClick={() => setLogoutOpen(false)}
              className="h-12 w-full text-[20px]"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="h-12 w-full text-[20px]"
            >
              {isLoggingOut ? "Logging out..." : "Log out"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
