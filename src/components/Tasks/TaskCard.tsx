import { Calendar, AlertCircle, CheckCircle, Clock, Edit, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AddCommentDialog } from "@/components/Forms/AddCommentDialog";
import { AttachFileDialog } from "@/components/Forms/AttachFileDialog";
import { TaskDetailsDialog } from "@/components/Tasks/TaskDetailsDialog";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: string;
  attachments?: number;
  comments?: number;
  company: string;
  company_id: string;
  createdBy: string;
  createdAt: string;
}

interface TaskCardProps {
  task: Task;
  onTaskChange: () => void;
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

export const TaskCard = ({ 
  task, 
  onTaskChange
}: TaskCardProps) => {
  const [updating, setUpdating] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const { profile } = useAuth();
  const { toast } = useToast();
  
  const StatusIcon = statusConfig[task.status as keyof typeof statusConfig]?.icon || AlertCircle;

  const canEdit = profile?.user_type === 'admin' || 
    (profile?.user_type === 'company_user' && profile.company_id === task.company_id);

  const updateTaskStatus = async (newStatus: string) => {
    if (!canEdit) return;
    
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus as 'open' | 'progress' | 'completed' })
        .eq('id', task.id);

      if (error) throw error;

      toast({
        title: "Status atualizado",
        description: "O status da tarefa foi atualizado com sucesso!",
      });

      onTaskChange();
    } catch (error) {
      console.error('Error updating task status:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar status. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const updateTaskPriority = async (newPriority: string) => {
    if (profile?.user_type !== 'admin') return;
    
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ priority: newPriority as 'high' | 'medium' | 'low' })
        .eq('id', task.id);

      if (error) throw error;

      toast({
        title: "Prioridade atualizada",
        description: "A prioridade da tarefa foi atualizada com sucesso!",
      });

      onTaskChange();
    } catch (error) {
      console.error('Error updating task priority:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar prioridade. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };
  
  return (
    <Card className="bg-gradient-card shadow-card hover:shadow-elevated transition-all duration-300 border-0">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-card-foreground mb-1">
              {task.title}
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {task.description}
            </p>
          </div>
          
          <div className="flex flex-col items-end space-y-2">
            {profile?.user_type === 'admin' ? (
              <Select 
                value={task.priority} 
                onValueChange={updateTaskPriority}
                disabled={updating}
              >
                <SelectTrigger className="w-24 h-6 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="low">Baixa</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Badge className={priorityConfig[task.priority as keyof typeof priorityConfig]?.className}>
                {priorityConfig[task.priority as keyof typeof priorityConfig]?.label}
              </Badge>
            )}
            
            {canEdit ? (
              <Select 
                value={task.status} 
                onValueChange={updateTaskStatus}
                disabled={updating}
              >
                <SelectTrigger className="w-32 h-6 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Aberto</SelectItem>
                  <SelectItem value="progress">Em Andamento</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Badge 
                variant="outline" 
                className={`${statusConfig[task.status as keyof typeof statusConfig]?.className} border-0`}
              >
                <StatusIcon className="w-3 h-3 mr-1" />
                {statusConfig[task.status as keyof typeof statusConfig]?.label}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(true)}
              className="h-8 px-2"
            >
              <Eye className="w-4 h-4 mr-1" />
              Ver Detalhes
            </Button>
            
            <AttachFileDialog
              taskId={task.id}
              onFileAttached={onTaskChange}
            />

            <AddCommentDialog
              taskId={task.id}
              onCommentAdded={onTaskChange}
            />
            
            {task.attachments > 0 && (
              <Badge variant="secondary" className="text-xs">
                {task.attachments} arquivo{task.attachments > 1 ? 's' : ''}
              </Badge>
            )}
            
            {task.comments > 0 && (
              <Badge variant="secondary" className="text-xs">
                {task.comments} comentário{task.comments > 1 ? 's' : ''}
              </Badge>
            )}
          </div>

          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>{task.dueDate}</span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-border/50">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Criado por: {task.createdBy}</span>
            <span>{task.createdAt}</span>
          </div>
        </div>
      </CardContent>
      
      <TaskDetailsDialog
        taskId={task.id}
        open={showDetails}
        onOpenChange={setShowDetails}
        onTaskChange={onTaskChange}
      />
    </Card>
  );
};