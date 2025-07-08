import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Zap, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { GenerationProgress } from "@/types/comic";

interface GenerationStatusProps {
  progress: GenerationProgress;
}

export const GenerationStatus = ({ progress }: GenerationStatusProps) => {
  const percentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;
  const isComplete = progress.current === progress.total && progress.total > 0;
  const hasError = progress.status.toLowerCase().includes("error") || progress.status.toLowerCase().includes("failed");

  const getStatusIcon = () => {
    if (hasError) return <AlertCircle className="w-5 h-5 text-destructive" />;
    if (isComplete) return <CheckCircle className="w-5 h-5 text-neon-green" />;
    return <Zap className="w-5 h-5 text-primary animate-pulse" />;
  };

  const getStatusColor = () => {
    if (hasError) return "text-destructive";
    if (isComplete) return "text-neon-green";
    return "text-primary";
  };

  return (
    <Card className="bg-cyber-card border-primary glow-effect">
      <CardHeader className="pb-3">
        <CardTitle className="text-primary flex items-center text-lg">
          {getStatusIcon()}
          <span className="ml-2">Generation Status</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <div className="flex items-center space-x-2">
              <Badge variant={isComplete ? "default" : "secondary"} className="text-xs">
                {progress.current} / {progress.total}
              </Badge>
              <span className={`font-medium ${getStatusColor()}`}>
                {Math.round(percentage)}%
              </span>
            </div>
          </div>
          
          <Progress 
            value={percentage} 
            className="h-2 bg-muted/30"
            style={{
              background: "linear-gradient(90deg, hsl(var(--primary) / 0.2), hsl(var(--secondary) / 0.2))"
            }}
          />
        </div>

        {/* Current Status */}
        <div className="flex items-center space-x-3 p-3 bg-muted/20 rounded-lg">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className={`text-sm font-medium ${getStatusColor()}`}>
              {progress.status}
            </p>
            {!isComplete && !hasError && (
              <p className="text-xs text-muted-foreground mt-1">
                This may take a few moments...
              </p>
            )}
          </div>
        </div>

        {/* Generation Steps */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Process Steps:</h4>
          <div className="space-y-1 text-xs">
            <div className={`flex items-center space-x-2 ${progress.current >= 1 ? 'text-neon-green' : 'text-muted-foreground'}`}>
              <div className={`w-2 h-2 rounded-full ${progress.current >= 1 ? 'bg-neon-green' : 'bg-muted-foreground'}`} />
              <span>Script analysis and scene breakdown</span>
            </div>
            <div className={`flex items-center space-x-2 ${progress.current >= 2 ? 'text-neon-green' : 'text-muted-foreground'}`}>
              <div className={`w-2 h-2 rounded-full ${progress.current >= 2 ? 'bg-neon-green' : 'bg-muted-foreground'}`} />
              <span>Character reference integration</span>
            </div>
            <div className={`flex items-center space-x-2 ${progress.current >= 3 ? 'text-neon-green' : 'text-muted-foreground'}`}>
              <div className={`w-2 h-2 rounded-full ${progress.current >= 3 ? 'bg-neon-green' : 'bg-muted-foreground'}`} />
              <span>Image generation with AI</span>
            </div>
            <div className={`flex items-center space-x-2 ${isComplete ? 'text-neon-green' : 'text-muted-foreground'}`}>
              <div className={`w-2 h-2 rounded-full ${isComplete ? 'bg-neon-green' : 'bg-muted-foreground'}`} />
              <span>Final panel compilation</span>
            </div>
          </div>
        </div>

        {/* Completion Message */}
        {isComplete && (
          <div className="p-3 bg-neon-green/10 border border-neon-green/30 rounded-lg">
            <p className="text-sm text-neon-green font-medium">
              ✨ Comic generation complete! Your panels are ready.
            </p>
          </div>
        )}

        {/* Error Message */}
        {hasError && (
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
            <p className="text-sm text-destructive font-medium">
              ⚠️ Generation failed. Please check your settings and try again.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};