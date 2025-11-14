import { Button } from "@/components/ui/button";
import { Menu, X, LogOut } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleAuthAction = async () => {
    if (user) {
      await signOut();
    } else {
      navigate("/auth");
    }
  };

  return (
    <nav className="fixed top-0 w-full bg-background/80 backdrop-blur-md border-b border-border z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold">
              UMP
            </div>
            <span className="text-xl font-bold text-foreground">UmpireScheduler</span>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-foreground hover:text-primary transition-colors">Features</a>
            <a href="#how-it-works" className="text-foreground hover:text-primary transition-colors">How It Works</a>
            <a href="#pricing" className="text-foreground hover:text-primary transition-colors">Pricing</a>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            <Button 
              variant="default"
              onClick={handleAuthAction}
            >
              {user ? (
                <>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </>
              ) : (
                "Get Started"
              )}
            </Button>
          </div>

          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>

        {isOpen && (
          <div className="md:hidden mt-4 pb-4 space-y-4">
            <a href="#features" className="text-foreground hover:text-primary transition-colors block">Features</a>
            <a href="#how-it-works" className="text-foreground hover:text-primary transition-colors block">How It Works</a>
            <a href="#pricing" className="text-foreground hover:text-primary transition-colors block">Pricing</a>
            <Button 
              variant="default" 
              className="w-full"
              onClick={handleAuthAction}
            >
              {user ? (
                <>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </>
              ) : (
                "Get Started"
              )}
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
