import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen, Wand2, AlertTriangle } from "lucide-react";
import { ComicConfig } from "@/types/comic";
import { comicAPI } from "@/services/api";
import { toast } from "sonner";

interface StoryInputProps {
  config: ComicConfig;
  onScriptGenerated: (script: string) => void;
}

export const StoryInput = ({ config, onScriptGenerated }: StoryInputProps) => {
  const [story, setStory] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyzeStory = async () => {
    if (!story.trim()) {
      toast.error("Please enter a story first!");
      return;
    }

    setIsAnalyzing(true);
    try {
      const script = await comicAPI.analyzeStoryToScript(story, config);
      onScriptGenerated(script);
      toast.success("Story analyzed and script generated successfully!");
    } catch (error) {
      console.error("Story analysis failed:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to analyze story";
      toast.error(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Check if selected text AI requires API key
  const requiresApiKey = config.textAI.startsWith('gemini') || config.textAI === 'openai';
  const hasRequiredKey = requiresApiKey ? comicAPI.hasRequiredAPIKey(config.textAI) : true;

  return (
    <Card className="bg-cyber-card border-primary">
      <CardHeader>
        <CardTitle className="text-primary flex items-center">
          <BookOpen className="w-5 h-5 mr-2" />
          Story Analysis
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Paste your story and let AI analyze it to create a comic script using {config.textAI}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasRequiredKey && (
          <div className="flex items-center space-x-2 p-3 bg-destructive/10 border border-destructive/50 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <span className="text-sm text-destructive">
              API key required for {config.textAI}. Please configure it in the API Keys section.
            </span>
          </div>
        )}
        
        <Textarea
          placeholder="Paste your story here... The AI will analyze it and create a comic script with proper scene descriptions and dialogue."
          value={story}
          onChange={(e) => setStory(e.target.value)}
          className="bg-muted/50 min-h-[200px] border-primary/30 focus:border-primary"
          disabled={isAnalyzing}
        />
        
        <div className="flex space-x-2">
          <Button
            onClick={handleAnalyzeStory}
            disabled={isAnalyzing || !story.trim() || !hasRequiredKey}
            className="bg-primary hover:bg-primary/80 text-primary-foreground"
          >
            <Wand2 className="w-4 h-4 mr-2" />
            {isAnalyzing ? "Analyzing..." : "Analyze Story"}
          </Button>
          
          <Button
            variant="outline"
            onClick={() => setStory("")}
            disabled={isAnalyzing}
          >
            Clear
          </Button>
        </div>
        
        <div className="text-xs text-muted-foreground">
          <p>• The AI will break down your story into comic panels</p>
          <p>• It will create visual descriptions and dialogue</p>
          <p>• Generated script will be optimized for {config.panelCount} panels per page</p>
        </div>
      </CardContent>
    </Card>
  );
};