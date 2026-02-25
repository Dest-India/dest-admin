"use client";

import { usePathname } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { mainNavItems } from "./sidebar-config";
import { LogOut, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { ADMIN_SESSION_KEY } from "@/lib/auth";

function AppSidebar({ className, ...props }) {
  const pathname = usePathname();
  const {theme, setTheme} = useTheme();

  function habdelLogout() {
    window.localStorage.removeItem(ADMIN_SESSION_KEY);
    window.location.href = "/";
  }

  return (
    <Sidebar collapsible="icon" variant="inset" className={className} {...props}>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Panels</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => {
                const isActive = pathname?.startsWith(item.href);
                const Icon = item.icon;

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <a
                        href={item.href}
                        className="flex items-center gap-2"
                      >
                        <Icon />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Dark Mode" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? <Sun /> : <Moon />}
              <span>{theme === "dark" ? "Light" : "Dark"} Mode</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton variant="destructive" tooltip="Log Out" onClick={() => habdelLogout()}>
              <LogOut />
              <span>Log Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export { AppSidebar };
