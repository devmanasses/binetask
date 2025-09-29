import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Building, Users, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface Company {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

interface Profile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  user_type: string;
  company_id: string | null;
  is_active: boolean;
  company?: { name: string };
}

export const SettingsPage = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados para formulários
  const [companyForm, setCompanyForm] = useState({ name: "" });
  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    password: "",
    user_type: "company_user" as "admin" | "company_user",
    company_ids: [] as string[],
  });

  // Estados para dialogs
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const { profile } = useAuth();
  const { toast } = useToast();

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name');

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          company:companies(name)
        `)
        .order('name');

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchCompanies(), fetchProfiles()]);
      setLoading(false);
    };

    if (profile?.user_type === 'admin') {
      loadData();
    } else {
      setLoading(false);
    }
  }, [profile]);

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      const { error } = await supabase
        .from('companies')
        .insert([{ name: companyForm.name }]);

      if (error) throw error;

      toast({
        title: "Empresa criada",
        description: "A empresa foi criada com sucesso!",
      });

      setCompanyForm({ name: "" });
      setCompanyDialogOpen(false);
      fetchCompanies();
    } catch (error) {
      console.error('Error creating company:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar empresa. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteCompany = async (companyId: string) => {
    try {
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', companyId);

      if (error) throw error;

      toast({
        title: "Empresa excluída",
        description: "A empresa foi excluída com sucesso!",
      });

      fetchCompanies();
    } catch (error) {
      console.error('Error deleting company:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir empresa. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      // Primeiro deletar o perfil, o que também deletará o usuário por cascade
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Usuário excluído",
        description: "O usuário foi excluído com sucesso!",
      });

      fetchProfiles();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir usuário. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      // Criar usuário no Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userForm.email,
        password: userForm.password,
        options: {
          data: {
            name: userForm.name,
            user_type: userForm.user_type,
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // Atualizar perfil com tipo de usuário
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ user_type: userForm.user_type })
          .eq('user_id', authData.user.id);

        if (profileError) throw profileError;

        // Adicionar associações com empresas se for usuário de empresa
        if (userForm.user_type === 'company_user' && userForm.company_ids.length > 0) {
          const associations = userForm.company_ids.map(company_id => ({
            user_id: authData.user!.id,
            company_id
          }));

          // @ts-ignore - user_companies table will be created via migration
          const { error: associationError } = await (supabase as any)
            .from('user_companies')
            .insert(associations);

          if (associationError) throw associationError;
        }
      }

      toast({
        title: "Usuário criado",
        description: "O usuário foi criado com sucesso!",
      });

      setUserForm({
        name: "",
        email: "",
        password: "",
        user_type: "company_user",
        company_ids: [],
      });
      setUserDialogOpen(false);
      fetchProfiles();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar usuário. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setFormLoading(false);
    }
  };

  if (profile?.user_type !== 'admin') {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Acesso Restrito
            </h2>
            <p className="text-muted-foreground">
              Apenas administradores podem acessar as configurações do sistema.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Carregando...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
      </div>

      <Tabs defaultValue="companies" className="space-y-4">
        <TabsList>
          <TabsTrigger value="companies">Empresas</TabsTrigger>
          <TabsTrigger value="users">Usuários</TabsTrigger>
        </TabsList>

        <TabsContent value="companies" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Gerenciar Empresas</h2>
            <Dialog open={companyDialogOpen} onOpenChange={setCompanyDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-primary hover:opacity-90">
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Empresa
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Nova Empresa</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateCompany} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="company-name">Nome da Empresa</Label>
                    <Input
                      id="company-name"
                      value={companyForm.name}
                      onChange={(e) => setCompanyForm({ name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setCompanyDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={formLoading}>
                      {formLoading ? "Criando..." : "Criar"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {companies.map((company) => (
              <Card key={company.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      <Building className="w-5 h-5" />
                      <span>{company.name}</span>
                    </CardTitle>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir Empresa</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir a empresa "{company.name}"? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteCompany(company.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    <p>Status: {company.is_active ? "Ativa" : "Inativa"}</p>
                    <p>Criada em: {new Date(company.created_at).toLocaleDateString()}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Gerenciar Usuários</h2>
            <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-primary hover:opacity-90">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Usuário
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Novo Usuário</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="user-name">Nome</Label>
                    <Input
                      id="user-name"
                      value={userForm.name}
                      onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="user-email">Email</Label>
                    <Input
                      id="user-email"
                      type="email"
                      value={userForm.email}
                      onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="user-password">Senha</Label>
                    <Input
                      id="user-password"
                      type="password"
                      value={userForm.password}
                      onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="user-type">Tipo de Usuário</Label>
                    <Select 
                      value={userForm.user_type} 
                      onValueChange={(value: "admin" | "company_user") => 
                        setUserForm({ ...userForm, user_type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="company_user">Usuário da Empresa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {userForm.user_type === 'company_user' && (
                    <div className="space-y-2">
                      <Label>Empresas</Label>
                      <div className="border rounded-md p-4 space-y-2 max-h-48 overflow-y-auto">
                        {companies.map((company) => (
                          <div key={company.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`company-${company.id}`}
                              checked={userForm.company_ids.includes(company.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setUserForm({
                                    ...userForm,
                                    company_ids: [...userForm.company_ids, company.id]
                                  });
                                } else {
                                  setUserForm({
                                    ...userForm,
                                    company_ids: userForm.company_ids.filter(id => id !== company.id)
                                  });
                                }
                              }}
                            />
                            <Label
                              htmlFor={`company-${company.id}`}
                              className="text-sm font-normal cursor-pointer"
                            >
                              {company.name}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setUserDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={formLoading}>
                      {formLoading ? "Criando..." : "Criar"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profiles.map((profile) => (
              <Card key={profile.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      <Users className="w-5 h-5" />
                      <span>{profile.name}</span>
                    </CardTitle>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir Usuário</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir o usuário "{profile.name}"? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteUser(profile.user_id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Email: {profile.email}</p>
                    <p>Tipo: {profile.user_type === 'admin' ? 'Administrador' : 'Usuário da Empresa'}</p>
                    {profile.company && <p>Empresa: {profile.company.name}</p>}
                    <p>Status: {profile.is_active ? "Ativo" : "Inativo"}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};