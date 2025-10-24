import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { 
  login, 
  register, 
  loginSchema, 
  registerSchema,
  type LoginCredentials,
  type RegisterData 
} from "@/lib/queryClient";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const loginForm = useForm<LoginCredentials>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      toast({
        title: "Login realizado!",
        description: `Bem-vindo, ${data.user.name}!`,
      });
      setLocation("/dashboard");
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro ao fazer login",
        description: error.message || "Verifique suas credenciais e tente novamente",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: register,
    onSuccess: (data) => {
      toast({
        title: "Conta criada com sucesso!",
        description: `Bem-vindo, ${data.user.name}!`,
      });
      setLocation("/dashboard");
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro ao criar conta",
        description: error.message || "Tente novamente mais tarde",
      });
    },
  });

  const handleLogin = (data: LoginCredentials) => {
    loginMutation.mutate(data);
  };

  const handleRegister = (data: RegisterData) => {
    registerMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <span className="text-white text-3xl font-bold">N</span>
            </div>
          </div>
          <CardTitle className="text-2xl text-center">NuPIdentity</CardTitle>
          <CardDescription className="text-center">
            Central de Identidade NuPtechs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login" data-testid="tab-login">Entrar</TabsTrigger>
              <TabsTrigger value="register" data-testid="tab-register">Registrar</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="seu@email.com"
                            data-testid="input-login-email"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="••••••••"
                            data-testid="input-login-password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    className="w-full" 
                    data-testid="button-login-submit"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? "Entrando..." : "Entrar"}
                  </Button>
                </form>
              </Form>
            </TabsContent>
            
            <TabsContent value="register">
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
                  <FormField
                    control={registerForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="Seu nome completo"
                            data-testid="input-register-name"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="seu@email.com"
                            data-testid="input-register-email"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="••••••••"
                            data-testid="input-register-password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    className="w-full" 
                    data-testid="button-register-submit"
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? "Criando conta..." : "Criar conta"}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
