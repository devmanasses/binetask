import { Building2, Users, Archive } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Company {
  id: string;
  name: string;
  taskCount: number;
  isActive?: boolean;
}

interface CompanySidebarProps {
  companies: Company[];
  selectedCompany: string | null;
  onCompanySelect: (companyId: string) => void;
  onShowArchived: () => void;
  showArchived: boolean;
}

export const CompanySidebar = ({ 
  companies, 
  selectedCompany, 
  onCompanySelect,
  onShowArchived,
  showArchived
}: CompanySidebarProps) => {
  return (
    <aside className="w-64 bg-gradient-sidebar border-r border-border shadow-card">
      <div className="p-4">
        <div className="flex items-center space-x-2 mb-6">
          <Users className="w-5 h-5 text-sidebar-text" />
          <h2 className="text-lg font-semibold text-sidebar-text">Empresas</h2>
        </div>

        <Button
          variant={showArchived ? "default" : "outline"}
          className="w-full mb-4 justify-start"
          onClick={onShowArchived}
        >
          <Archive className="w-4 h-4 mr-2" />
          Tarefas Arquivadas
        </Button>

        <div className="space-y-2">
          {companies.map((company) => {
            const isSelected = selectedCompany === company.id;
            
            return (
              <button
                key={company.id}
                onClick={() => onCompanySelect(company.id)}
                className={`
                  w-full flex items-center justify-between p-3 rounded-xl text-left transition-all duration-200
                  ${isSelected 
                    ? "bg-sidebar-item-active text-primary-foreground shadow-md transform scale-[1.02]" 
                    : "bg-sidebar-item text-sidebar-text hover:bg-sidebar-item-active hover:text-primary-foreground hover:transform hover:scale-[1.01]"
                  }
                `}
              >
                <div className="flex items-center space-x-3">
                  <Building2 className="w-4 h-4" />
                  <span className="font-medium">{company.name}</span>
                </div>
                
                {company.taskCount > 0 && (
                  <Badge 
                    variant="secondary"
                    className={`
                      ${isSelected 
                        ? "bg-primary-foreground/20 text-primary-foreground" 
                        : "bg-status-open text-primary-foreground"
                      }
                    `}
                  >
                    {company.taskCount}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>

        {/* Empty state */}
        {companies.length === 0 && (
          <div className="text-center py-8">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              Nenhuma empresa cadastrada
            </p>
          </div>
        )}
      </div>
    </aside>
  );
};