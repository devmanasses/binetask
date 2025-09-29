import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, AlertCircle, CheckCircle, Clock, MessageCircle, Paperclip, Download, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { AddCommentDialog } from "@/components/Forms/AddCommentDialog";
import { AttachFileDialog } from "@/components/Forms/AttachFileDialog";

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  due_date: string;
  company_id: string;
  created_by: string;
  created_at: string;
}

interface Comment {
  id: string;
  comment: string;
  created_at: string;
  user_id: string;
  profiles?: {
    name: string;
  };
}

interface Attachment {
  id: string;
  filename: string;
  file_path: string;
  file_size: number;
  content_type: string;
  created_at: string;
  user_id: string;
  profiles?: {
    name: string;
  };
}

interface TaskDetailsDialogProps {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export const TaskDetailsDialog = ({ taskId, open, onOpenChange, onTaskChange }: TaskDetailsDialogProps) => {
  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const { profile } = useAuth();
  const { toast } = useToast();

  const fetchTaskDetails = async () => {
    if (!taskId) return;
    
    setLoading(true);
    try {
      // Fetch task details
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (taskError) throw taskError;
      setTask(taskData);

      // Fetch comments
      const { data: commentsData, error: commentsError } = await supabase
        .from('task_comments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (commentsError) throw commentsError;
      
      // Get user names for comments
      const userIds = [...new Set(commentsData?.map(c => c.user_id) || [])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, name')
        .in('user_id', userIds);

      const commentsWithNames = commentsData?.map(comment => ({
        ...comment,
        profiles: profilesData?.find(p => p.user_id === comment.user_id)
      })) || [];
      
      setComments(commentsWithNames);

      // Fetch attachments
      const { data: attachmentsData, error: attachmentsError } = await supabase
        .from('task_attachments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (attachmentsError) throw attachmentsError;
      
      // Get user names for attachments
      const attachmentUserIds = [...new Set(attachmentsData?.map(a => a.user_id) || [])];
      const { data: attachmentProfilesData } = await supabase
        .from('profiles')
        .select('user_id, name')
        .in('user_id', attachmentUserIds);

      const attachmentsWithNames = attachmentsData?.map(attachment => ({
        ...attachment,
        profiles: attachmentProfilesData?.find(p => p.user_id === attachment.user_id)
      })) || [];
      
      setAttachments(attachmentsWithNames);

    } catch (error) {
      console.error('Error fetching task details:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar detalhes da tarefa.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && taskId) {
      fetchTaskDetails();
    }
  }, [open, taskId]);

  const handleRefresh = () => {
    fetchTaskDetails();
    onTaskChange();
  };

  const downloadAttachment = async (attachment: Attachment) => {
    try {
      const { data, error } = await supabase.storage
        .from('attachments')
        .download(attachment.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading attachment:', error);
      toast({
        title: "Erro",
        description: "Erro ao baixar arquivo.",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  if (!task) return null;

  const StatusIcon = statusConfig[task.status as keyof typeof statusConfig]?.icon || AlertCircle;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">{task.title}</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <div className="space-y-6 pr-4">
            {/* Task Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informações da Tarefa</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Descrição</h4>
                  <p className="text-muted-foreground">{task.description || "Sem descrição"}</p>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <h4 className="font-medium mb-1">Status</h4>
                    <Badge className={statusConfig[task.status as keyof typeof statusConfig]?.className}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {statusConfig[task.status as keyof typeof statusConfig]?.label}
                    </Badge>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-1">Prioridade</h4>
                    <Badge className={priorityConfig[task.priority as keyof typeof priorityConfig]?.className}>
                      {priorityConfig[task.priority as keyof typeof priorityConfig]?.label}
                    </Badge>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-1">Data de Vencimento</h4>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4 mr-1" />
                      {task.due_date ? new Date(task.due_date).toLocaleDateString('pt-BR') : 'Não definida'}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-1">Criado em</h4>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(task.created_at)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Comments Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center">
                    <MessageCircle className="w-5 h-5 mr-2" />
                    Comentários ({comments.length})
                  </CardTitle>
                  <AddCommentDialog
                    taskId={taskId!}
                    onCommentAdded={handleRefresh}
                  />
                </div>
              </CardHeader>
              <CardContent>
                {comments.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhum comentário ainda. Seja o primeiro a comentar!
                  </p>
                ) : (
                  <div className="space-y-4">
                    {comments.map((comment, index) => (
                      <div key={comment.id}>
                        <div className="flex items-start space-x-3">
                          <div className="bg-primary/10 rounded-full p-2">
                            <User className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="font-medium text-sm">
                                {comment.profiles?.name || 'Usuário'}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(comment.created_at)}
                              </span>
                            </div>
                            <p className="text-sm text-foreground">{comment.comment}</p>
                          </div>
                        </div>
                        {index < comments.length - 1 && <Separator className="mt-4" />}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Attachments Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center">
                    <Paperclip className="w-5 h-5 mr-2" />
                    Anexos ({attachments.length})
                  </CardTitle>
                  <AttachFileDialog
                    taskId={taskId!}
                    onFileAttached={handleRefresh}
                  />
                </div>
              </CardHeader>
              <CardContent>
                {attachments.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhum arquivo anexado ainda.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {attachments.map((attachment) => (
                      <div key={attachment.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          <Paperclip className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{attachment.filename}</p>
                            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                              <span>{formatFileSize(attachment.file_size)}</span>
                              <span>•</span>
                              <span>Por {attachment.profiles?.name || 'Usuário'}</span>
                              <span>•</span>
                              <span>{formatDate(attachment.created_at)}</span>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadAttachment(attachment)}
                          className="flex-shrink-0"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};