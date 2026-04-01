import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Home, Users, FileText, GraduationCap, Dna, BookOpen,
  Scale, Library, User, LogOut, Sparkles
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { AuthModal } from '@/components/AuthModal';
import type { User as SupabaseUser } from '@supabase/supabase-js';

const mainNav = [
  { title: 'Home', url: '/', icon: Home },
  { title: 'Characters', url: '/characters', icon: Users },
  { title: 'Formatter', url: '/script-formatter', icon: FileText },
  { title: 'Film School', url: '/film-school', icon: GraduationCap },
  { title: 'Engine', url: '/narrative-engine', icon: Dna },
  { title: 'Shakespeare', url: '/shakespeare', icon: BookOpen },
];

const studioNav = [
  { title: 'Studios Hub', url: '/astralnaut-studios', icon: Sparkles },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarContent>
          {/* Brand */}
          <div className={`px-4 py-4 ${collapsed ? 'text-center' : ''}`}>
            <span className="font-display text-lg text-foreground tracking-widest">
              {collapsed ? 'C' : 'Celsius'}
            </span>
          </div>

          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {mainNav.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <NavLink to={item.url} end={item.url === '/'} className="hover:bg-muted/50" activeClassName="bg-muted text-primary font-medium">
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
                {user?.email === 'phil@streamwalkers.com' && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive('/patents')}>
                      <NavLink to="/patents" className="hover:bg-muted/50" activeClassName="bg-muted text-primary font-medium">
                        <Scale className="h-4 w-4" />
                        {!collapsed && <span>Patents</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Astralnaut</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {studioNav.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <NavLink to={item.url} className="hover:bg-muted/50" activeClassName="bg-muted text-primary font-medium">
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            {user ? (
              <>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive('/library')}>
                    <NavLink to="/library" className="hover:bg-muted/50" activeClassName="bg-muted text-primary font-medium">
                      <Library className="h-4 w-4" />
                      {!collapsed && <span>Library</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={handleSignOut}>
                    <LogOut className="h-4 w-4" />
                    {!collapsed && <span>Sign Out</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </>
            ) : (
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => setShowAuthModal(true)}>
                  <User className="h-4 w-4" />
                  {!collapsed && <span>Sign In</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} onSuccess={() => setShowAuthModal(false)} />
    </>
  );
}
