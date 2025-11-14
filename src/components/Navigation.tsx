import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

const Navigation = () => {
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
            <Button variant="ghost">Sign In</Button>
            <Button variant="default">Get Started</Button>
          </div>

          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
