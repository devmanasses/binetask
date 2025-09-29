import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Archive, Calendar, AlertCircle, CheckCircle, Clock, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface ArchivedTask {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: string;
  company: string;
  company_id: string;
  archived_at: string;
}

interface ArchivedTasksListProps {
  companyId: string | null;
  onClose: () => void;
}

const statusConfig = {
  open: { 
    icon: AlertCircle, 
    label: "Aberto", 
    className: "bg-status-open text-primary-foreground" 
  },
  progress: { 
    icon: Clock, 
    label: "Em Andamento", 
    className: "bg-status-progress text-primary-foreground" 
  },
  completed: { 
    icon: CheckCircle, 
    label: "Concluído", 
    className: "bg-status-completed text-primary-foreground" 
  },
};

const priorityConfig = {
  high: { label: "Alta", className: "bg-status-priority-high text-primary-foreground" },
  medium: { label: "Média", className: "bg-status-priority-medium text-primary-foreground" },
  low: { label: "Baixa", className: "bg-status-priority-low text-primary-foreground" },
};

export const ArchivedTasksList = ({ companyId, onClose }: ArchivedTasksListProps) => {
  const [tasks, setTasks] = useState<ArchivedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const { toast } = useToast();

  const fetchArchivedTasks = async () => {
    try {
      setLoading(true);
      
      // @ts-ignore - Supabase type inference issue
      let query = supabase.from('tasks').select('*, company:companies(name)').eq('is_archived', true);
      
      if (companyId) {
        query = query.eq('company_id', companyId);
      } else if (profile?.user_type === 'company_user' && profile.company_id) {
        query = query.eq('company_id', profile.company_id);
      }
      
      const { data, error } = await query;

      if (error) throw error;

      const formattedTasks = data?.map((task: any) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        dueDate: task.due_date ? new Date(task.due_date).toLocaleDateString('pt-BR') : '',
        company: task.company?.name || '',
        company_id: task.company_id,
        archived_at: new Date(task.archived_at).toLocaleDateString('pt-BR'),
      })) || [];

      setTasks(formattedTasks);
    } catch (error) {
      console.error('Error fetching archived tasks:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar tarefas arquivadas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchivedTasks();
  }, [companyId]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Carregando tarefas arquivadas...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Archive className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Tarefas Arquivadas</h1>
          <Badge variant="secondary">{tasks.length}</Badge>
        </div>
        <Button variant="outline" onClick={onClose}>
          <X className="w-4 h-4 mr-2" />
          Voltar
        </Button>
      </div>

      {tasks.length === 0 ? (
        <Card className="bg-gradient-card">
          <CardContent className="p-12 text-center">
            <Archive className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Nenhuma tarefa arquivada
            </h3>
            <p className="text-muted-foreground">
              As tarefas concluídas aparecerão aqui automaticamente.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => {
            const StatusIcon = statusConfig[task.status as keyof typeof statusConfig]?.icon || AlertCircle;
            
            return (
              <Card key={task.id} className="bg-gradient-card shadow-card border-0">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-1">{task.title}</CardTitle>
                      <p className="text-muted-foreground text-sm">{task.description}</p>
                    </div>
                    
                    <div className="flex flex-col items-end space-y-2">
                      <Badge className={priorityConfig[task.priority as keyof typeof priorityConfig]?.className}>
                        {priorityConfig[task.priority as keyof typeof priorityConfig]?.label}
                      </Badge>
                      
                      <Badge 
                        variant="outline" 
                        className={`${statusConfig[task.status as keyof typeof statusConfig]?.className} border-0`}
                      >
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusConfig[task.status as keyof typeof statusConfig]?.label}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-4">
                      <span className="text-muted-foreground">Empresa: {task.company}</span>
                      <div className="flex items-center space-x-1 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>Prazo: {task.dueDate}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 text-muted-foreground">
                      <Archive className="w-4 h-4" />
                      <span>Arquivado em: {task.archived_at}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
