import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, FileText, Wand2 } from "lucide-react";

interface ScriptInputProps {
  script: string;
  onScriptChange: (script: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

export const ScriptInput = ({ script, onScriptChange, onGenerate, isGenerating }: ScriptInputProps) => {
  const [sceneCount, setSceneCount] = useState(0);

  const analyzeScript = (text: string) => {
    // Count scenes by looking for INT. or EXT. at the start of lines
    const sceneHeadings = text.match(/^(INT\.|EXT\.)/gm);
    setSceneCount(sceneHeadings ? sceneHeadings.length : 0);
  };

  // Analyze script whenever it changes
  useEffect(() => {
    analyzeScript(script);
  }, [script]);

  const handleScriptChange = (value: string) => {
    onScriptChange(value);
  };

  const sampleScript = `FADE IN:

EXT. CYBERPUNK CITY - NIGHT

Neon lights reflect off wet streets. A lone figure in a trench coat walks through the shadows.

DETECTIVE NOVA
(voice over)
The year is 2087. Technology has evolved, but humanity hasn't.

She stops at a holographic newsstand. Headlines about missing androids scroll past.

DETECTIVE NOVA (CONT'D)
Another android has gone missing. That makes twelve this month.

INT. POLICE STATION - CONTINUOUS

Nova enters a futuristic police station. Holographic displays show criminal data.

CAPTAIN CHROME
Nova, we've got another case for you.

DETECTIVE NOVA
Let me guess. Another missing android?

FADE OUT.`;

  return (
    <Card className="bg-cyber-card border-neon">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-neon flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Script Input
          </CardTitle>
          <div className="flex space-x-2">
            <Badge variant="secondary" className="text-xs">
              {script.length} chars
            </Badge>
            <Badge variant="outline" className="text-xs">
              {sceneCount} scenes
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder="Enter your comic script here in screenplay format... 
          
EXT. CYBERPUNK CITY - NIGHT
A mysterious figure walks through a cyberpunk city...

CHARACTER A
(V.O.)
Hello, world of tomorrow!"
          value={script}
          onChange={(e) => handleScriptChange(e.target.value)}
          className="min-h-[300px] bg-muted/50 border-border resize-none font-mono text-sm"
        />
        
        <div className="flex space-x-2">
          <Button
            onClick={onGenerate}
            disabled={!script.trim() || isGenerating}
            className="flex-1 bg-gradient-cyber hover:shadow-cyber"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 mr-2 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Generate Comic
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            onClick={() => handleScriptChange(sampleScript)}
            className="border-secondary"
          >
            <Wand2 className="w-4 h-4 mr-2" />
            Sample Script
          </Button>
        </div>
        
        {script.trim() && (
          <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-md">
            <p className="mb-1">📝 Script Preview:</p>
            <p>Detected {sceneCount} scenes based on INT./EXT. headings. The app will generate panels from action and dialogue blocks.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
