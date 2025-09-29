import { Building2, Settings, Home } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "./ThemeToggle";
import binewebLogoBlack from "@/assets/bineweb-logo-black.png";
import binewebLogoWhite from "@/assets/bineweb-logo-white.png";

interface HeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  taskCount: number;
  onLogout: () => void;
  userType: 'admin' | 'company_user';
}

export const Header = ({ activeTab, onTabChange, taskCount, onLogout, userType }: HeaderProps) => {
  const tabs = [
    { id: "inicio", label: "início", icon: Home },
    { id: "chamados", label: "chamados", icon: Building2, count: taskCount },
    { id: "configuracoes", label: "configurações", icon: Settings },
  ];

  return (
    <header className="bg-gradient-primary shadow-card">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Logo */}
        <div className="flex items-center space-x-3">
          <img 
            src={binewebLogoBlack} 
            alt="bineweb" 
            className="h-14 dark:hidden" 
          />
          <img 
            src={binewebLogoWhite} 
            alt="bineweb" 
            className="h-14 hidden dark:block" 
          />
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center space-x-1 bg-primary-foreground/10 rounded-full p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`
                  relative flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
                  ${isActive 
                    ? "bg-primary-foreground text-primary shadow-md" 
                    : "text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <Badge 
                    variant="secondary" 
                    className="ml-1 bg-status-open text-primary-foreground"
                  >
                    {tab.count}
                  </Badge>
                )}
              </button>
            );
          })}
        </nav>

        {/* Theme Toggle and Logout */}
        <div className="flex items-center space-x-2">
          <ThemeToggle />
          <button
            onClick={onLogout}
            className="flex items-center space-x-2 px-4 py-2 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-full transition-all duration-200"
          >
            <span className="text-sm font-medium">Sair</span>
          </button>
        </div>
      </div>
    </header>
  );
};