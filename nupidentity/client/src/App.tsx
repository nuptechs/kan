import { useEffect } from "react";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Route, Switch, useLocation } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import LoginPage from "@/pages/LoginPage";
import { queryClient, getCurrentUser, isAuthenticated } from "@/lib/queryClient";

function AuthCheck({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: getCurrentUser,
    enabled: isAuthenticated(),
    retry: false,
  });

  useEffect(() => {
    if (error && isAuthenticated()) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
    }

    if (!isLoading && !user && location !== "/login" && location !== "/") {
      setLocation("/login");
    }
  }, [user, isLoading, error, location, setLocation]);

  return <>{children}</>;
}

function DashboardPage() {
  const { data: user } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: getCurrentUser,
  });

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Dashboard</h1>
        {user && (
          <div className="space-y-2">
            <p className="text-xl">Bem-vindo, {user.name}!</p>
            <p className="text-muted-foreground">{user.email}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthCheck>
        <Switch>
          <Route path="/" component={LoginPage} />
          <Route path="/login" component={LoginPage} />
          <Route path="/dashboard" component={DashboardPage} />
          <Route>
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center">
                <h1 className="text-4xl font-bold mb-4">404</h1>
                <p>Página não encontrada</p>
              </div>
            </div>
          </Route>
        </Switch>
      </AuthCheck>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
