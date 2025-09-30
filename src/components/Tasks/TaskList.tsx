import { useState } from "react";
import { TaskCard } from "./TaskCard";
import { TaskFilters } from "./TaskFilters";
import { CreateTaskDialog } from "@/components/Forms/CreateTaskDialog";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";

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

interface Company {
  id: string;
  name: string;
  taskCount: number;
  isActive: boolean;
}

interface TaskListProps {
  tasks: Task[];
  companies: Company[];
  selectedCompany: string | null;
  onTasksChange: () => void;
  userType: 'admin' | 'company_user';
}

export const TaskList = ({ 
  tasks, 
  companies,
  selectedCompany, 
  onTasksChange,
  userType
}: TaskListProps) => {
  const [filters, setFilters] = useState<{
    status?: string;
    priority?: string;
    company?: string;
  }>({});

  // Apply filters
  let filteredTasks = tasks;

  // Apply status filter
  if (filters.status) {
    filteredTasks = filteredTasks.filter(task => task.status === filters.status);
  }
  
  // Apply priority filter
  if (filters.priority) {
    filteredTasks = filteredTasks.filter(task => task.priority === filters.priority);
  }
  
  // Apply company filter - priority to dropdown filter if set, otherwise use sidebar selection
  if (userType === 'admin') {
    const companyFilter = filters.company || selectedCompany;
    if (companyFilter) {
      filteredTasks = filteredTasks.filter(task => task.company_id === companyFilter);
    }
  }

  const taskStats = {
    total: filteredTasks.length,
    open: filteredTasks.filter(t => t.status === "open").length,
    progress: filteredTasks.filter(t => t.status === "progress").length,
    completed: filteredTasks.filter(t => t.status === "completed").length,
  };

  const selectedCompanyName = selectedCompany 
    ? companies.find(c => c.id === selectedCompany)?.name 
    : null;

  return (
    <div className="flex-1 p-6">
      {/* Header com estatísticas */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold text-foreground">
            {selectedCompanyName ? `Tarefas - ${selectedCompanyName}` : "Todas as Tarefas"}
          </h2>
          
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="bg-status-open text-primary-foreground border-0">
              Abertas: {taskStats.open}
            </Badge>
            <Badge variant="outline" className="bg-status-progress text-primary-foreground border-0">
              Em Andamento: {taskStats.progress}
            </Badge>
            <Badge variant="outline" className="bg-status-completed text-primary-foreground border-0">
              Concluídas: {taskStats.completed}
            </Badge>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <TaskFilters
            onFiltersChange={setFilters}
            companies={companies}
            showCompanyFilter={userType === 'admin' && !selectedCompany}
          />
          
          <CreateTaskDialog
            companies={companies}
            onTaskCreated={onTasksChange}
          />
        </div>
      </div>

      {/* Lista de tarefas */}
      <div className="space-y-4">
        {filteredTasks.length > 0 ? (
          filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onTaskChange={onTasksChange}
            />
          ))
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-primary-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Nenhuma tarefa encontrada
            </h3>
            <p className="text-muted-foreground">
              {selectedCompanyName 
                ? `Não há tarefas para ${selectedCompanyName}` 
                : "Não há tarefas cadastradas no sistema"
              }
            </p>
            <CreateTaskDialog
              companies={companies}
              onTaskCreated={onTasksChange}
            />
          </div>
        )}
      </div>
    </div>
  );
};