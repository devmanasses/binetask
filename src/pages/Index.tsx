import { useState, useEffect } from "react";
import { Header } from "@/components/Layout/Header";
import { CompanySidebar } from "@/components/Layout/CompanySidebar";
import { TaskList } from "@/components/Tasks/TaskList";
import { ArchivedTasksList } from "@/components/Tasks/ArchivedTasksList";
import { LoginForm } from "@/components/Auth/LoginForm";
import { SettingsPage } from "@/components/Settings/SettingsPage";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const AppContent = () => {
  const [activeTab, setActiveTab] = useState("chamados");
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);

  const { user, profile, signOut } = useAuth();

  const fetchCompanies = async () => {
    try {
      const { data, error }: any = await supabase
        .from('companies')
        .select(`
          id,
          name,
          is_active
        `)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      // Buscar contagem de tarefas não arquivadas para cada empresa
      const companiesWithCount = await Promise.all(
        (data || []).map(async (company: any) => {
          const { count }: any = await supabase
            .from('tasks')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', company.id)
            .eq('is_archived', false);

          return {
            id: company.id,
            name: company.name,
            taskCount: count || 0,
            isActive: company.is_active
          };
        })
      );

      setCompanies(companiesWithCount);
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const fetchTasks = async () => {
    try {
      const query = supabase.from('tasks').select('*, company:companies(name), comments:task_comments(count), attachments:task_attachments(count)');
      
      // @ts-ignore
      const { data, error } = await query.eq('is_archived', false).order('created_at', { ascending: false });

      if (error) throw error;

      const formattedTasks = data?.map((task: any) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        dueDate: task.due_date ? new Date(task.due_date).toLocaleDateString('pt-BR') : '',
        attachments: task.attachments?.[0]?.count || 0,
        comments: task.comments?.[0]?.count || 0,
        company: task.company?.name || '',
        company_id: task.company_id,
        createdBy: 'Usuário',
        createdAt: new Date(task.created_at).toLocaleDateString('pt-BR'),
        is_archived: task.is_archived,
      })) || [];

      setTasks(formattedTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchCompanies(), fetchTasks()]);
      setLoading(false);
    };

    if (user && profile) {
      loadData();
      
      // Set default company for company users
      if (profile.user_type === 'company_user' && profile.company_id) {
        setSelectedCompany(profile.company_id);
      }

      // Configurar realtime para atualizar números automaticamente
      const channel = supabase
        .channel('tasks-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tasks'
          },
          () => {
            // Atualizar companies e tasks quando houver mudanças
            fetchCompanies();
            fetchTasks();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, profile]);

  if (!user || !profile) {
    return <LoginForm />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  // Filter companies based on user type
  const visibleCompanies = profile.user_type === 'admin' 
    ? companies 
    : companies.filter(c => c.id === profile.company_id);

  // Filter tasks based on user type and selected company
  let visibleTasks = profile.user_type === 'admin' 
    ? tasks 
    : tasks.filter(t => t.company_id === profile.company_id);

  if (selectedCompany && profile.user_type === 'admin') {
    visibleTasks = visibleTasks.filter(t => t.company_id === selectedCompany);
  }

  const totalTasks = visibleTasks.length;

  return (
    <div className="min-h-screen bg-background">
      <Header 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        taskCount={totalTasks}
        onLogout={signOut}
        userType={profile.user_type}
      />
      
      <div className="flex">
        <CompanySidebar
          companies={visibleCompanies}
          selectedCompany={selectedCompany}
          onCompanySelect={(id) => {
            setSelectedCompany(id);
            setShowArchived(false);
          }}
          onShowArchived={() => setShowArchived(!showArchived)}
          showArchived={showArchived}
        />
        
        <main className="flex-1">
          {activeTab === "chamados" && !showArchived && (
            <TaskList
              tasks={visibleTasks}
              companies={companies}
              selectedCompany={selectedCompany}
              onTasksChange={fetchTasks}
              userType={profile.user_type}
            />
          )}

          {activeTab === "chamados" && showArchived && (
            <ArchivedTasksList
              companyId={selectedCompany}
              onClose={() => setShowArchived(false)}
            />
          )}
          
          {activeTab === "inicio" && (
            <div className="p-6">
              <div className="bg-gradient-card p-8 rounded-xl shadow-card">
                <h2 className="text-2xl font-bold text-foreground mb-4">
                  Bem-vindo ao Sistema bineweb
                </h2>
                <p className="text-muted-foreground mb-6">
                  Sistema de gestão de tarefas para empresas com controle de permissões e auditoria completa.
                </p>
                
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-primary/10 p-4 rounded-lg">
                    <h3 className="font-semibold text-primary mb-2">Tarefas Abertas</h3>
                    <p className="text-2xl font-bold text-primary">
                      {visibleTasks.filter(t => t.status === "open").length}
                    </p>
                  </div>
                  <div className="bg-status-progress/10 p-4 rounded-lg">
                    <h3 className="font-semibold text-status-progress mb-2">Em Andamento</h3>
                    <p className="text-2xl font-bold text-status-progress">
                      {visibleTasks.filter(t => t.status === "progress").length}
                    </p>
                  </div>
                  <div className="bg-status-completed/10 p-4 rounded-lg">
                    <h3 className="font-semibold text-status-completed mb-2">Concluídas</h3>
                    <p className="text-2xl font-bold text-status-completed">
                      {visibleTasks.filter(t => t.status === "completed").length}
                    </p>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>Usuário atual:</strong> {profile.name} ({profile.user_type === "admin" ? "Administrador" : "Usuário Empresa"})
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === "configuracoes" && (
            <SettingsPage />
          )}
          
        </main>
      </div>
    </div>
  );
};

const Index = () => {
  return <AppContent />;
};

export default Index;
