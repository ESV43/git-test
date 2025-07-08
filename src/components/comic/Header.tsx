import { Button } from "@/components/ui/button";
import { Zap, BookOpen, Sparkles } from "lucide-react";

export const Header = () => {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo & Title */}
          <div className="flex items-center space-x-4">
            <div className="relative">
              <BookOpen className="w-8 h-8 text-primary glow-effect" />
              <Sparkles className="w-4 h-4 text-secondary absolute -top-1 -right-1" />
            </div>
            <div>
              <h1 className="text-2xl font-orbitron font-bold text-neon">
                Comic<span className="text-secondary">AI</span>
              </h1>
              <p className="text-sm text-muted-foreground">
                AI-Powered Comic Book Generator
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" className="border-neon">
              <Zap className="w-4 h-4 mr-2" />
              API Keys
            </Button>
            
            <Button variant="default" size="sm" className="bg-gradient-cyber">
              Pro Version
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};