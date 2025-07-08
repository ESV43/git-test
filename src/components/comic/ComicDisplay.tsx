import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, } from "@/components/ui/tooltip";
import { BookOpen, Edit, RotateCcw, Maximize, Eye, EyeOff } from "lucide-react";
import { ComicPanel, ComicConfig, Character } from "@/types/comic";
import { comicAPI } from "@/services/api";
import { Textarea } from "../ui/textarea";
import { Input } from "../ui/input";

interface ComicDisplayProps {
  panels: ComicPanel[];
  onPanelsChange: (panels: ComicPanel[]) => void;
  config: ComicConfig;
  characters: Character[];
}

export const ComicDisplay = ({ panels, onPanelsChange, config, characters, }: ComicDisplayProps) => {
  const [showDialogue, setShowDialogue] = useState(true);
  const [editingPanel, setEditingPanel] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<ComicPanel>>({});

  const handleEditPanel = (panel: ComicPanel) => {
    setEditingPanel(panel.id);
    setEditData({
      sceneDescription: panel.sceneDescription,
      dialogue: panel.dialogue
    });
  };

  const saveEdit = () => {
    if (!editingPanel) return;

    const updatedPanels = panels.map((panel) =>
      panel.id === editingPanel
        ? { ...panel, ...editData }
        : panel
    );
    
    onPanelsChange(updatedPanels);
    setEditingPanel(null);
    setEditData({});
  };

  const regeneratePanel = async (panelId: string) => {
    const panelToRegen = panels.find((p) => p.id === panelId);
    if (!panelToRegen) return;

    // Mark panel as regenerating
    let updatedPanels = panels.map((panel) =>
      panel.id === panelId
        ? { ...panel, isGenerating: true, error: undefined }
        : panel
    );
    onPanelsChange(updatedPanels);

    try {
      const imageUrl = await comicAPI.generateImage(panelToRegen.sceneDescription, config, characters);
      const promptUsed = comicAPI.buildImagePrompt(panelToRegen.sceneDescription, config, characters);

      const finalPanels = panels.map((panel) =>
        panel.id === panelId
          ? {
              ...panel,
              isGenerating: false,
              imageUrl,
              promptUsed,
            }
          : panel
      );
      onPanelsChange(finalPanels);
    } catch (error) {
      console.error("Panel regeneration failed:", error);
      const finalPanels = panels.map((panel) => panel.id === panelId ? { ...panel, isGenerating: false, error: `Regeneration failed.`, } : panel);
      onPanelsChange(finalPanels);
    }
  };

  const getGridCols = () => {
    if (panels.length === 1) return "grid-cols-1";
    if (panels.length === 2) return "grid-cols-1 md:grid-cols-2";
    if (panels.length <= 4) return "grid-cols-1 md:grid-cols-2";
    if (panels.length <= 6) return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
    return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
  };

  const getFontClass = (fontName: string) => {
    switch (fontName) {
      case "comic-sans":
        return 'font-["Comic_Sans_MS",_"Comic_Neue",_cursive]';
      case "anime":
        return "font-rajdhani font-bold tracking-wide";
      case "gothic":
        return "font-orbitron";
      case "modern":
        return "font-sans";
      default:
        return "font-sans";
    }
  };

  const dialogueBubbleStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '1rem',
    left: '1rem',
    right: '1rem',
    padding: '0.5rem 1rem', backgroundColor: 'rgba(255, 255, 255, 0.9)', border: '2px solid black', borderRadius: '10px', textAlign: 'center', color: 'black', textShadow: '1px 1px 0 #fff',
  };

  return (
    <Card className="bg-cyber-card border-primary">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-primary flex items-center">
            <BookOpen className="w-5 h-5 mr-2" />
            Comic Panels
          </CardTitle>

          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowDialogue(!showDialogue)}
              className="border-primary"
            >
              {showDialogue ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
              Dialogue
            </Button>

            <Badge variant="secondary" className="text-xs">
              {panels.length} panels
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {panels.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No Panels Generated</h3>
            <p>Enter a script and click "Generate Comic" to create your comic panels.</p>
          </div>
        ) : (
          <div className={`grid ${getGridCols()} gap-6`}>
            {panels.map((panel, index) => (
              <div key={panel.id} className="space-y-3 bg-cyber-card p-3 rounded-lg border border-border">
                {/* Panel Image */}
                <div className="relative group bg-muted/30 rounded-lg overflow-hidden border border-border aspect-[4/3]" >
                  {panel.isGenerating ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
                      <div className="text-center space-y-2">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                        <p className="text-sm text-muted-foreground">Generating...</p>
                      </div>
                    </div>
                  ) : panel.imageUrl ? (
                    <>
                      <img
                        src={panel.imageUrl}
                        alt={`Panel ${index + 1}`}
                        className="w-full h-full object-cover"
                      />

                      {/* Panel Overlay */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="secondary">
                              <Maximize className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl">
                            <DialogHeader>
                              <DialogTitle>Panel {index + 1}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <img src={panel.imageUrl} alt={`Panel ${index + 1}`} className="w-full rounded-lg" />
                              {showDialogue && panel.dialogue && (
                                <div className={`p-4 bg-muted/50 rounded-lg text-center ${getFontClass(config.speechBubbleFont)}`}>
                                  <p className="font-medium text-lg">{panel.dialogue}</p>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>

                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleEditPanel(panel)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>

                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => regeneratePanel(panel.id)}
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      </div>
                    </>
                  ) : panel.error ? (
                    <div className="absolute inset-0 flex items-center justify-center p-4">
                      <div className="text-center text-destructive">
                        <p className="font-semibold">Image Generation Failed</p>
                        <p className="text-xs">{panel.error}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-muted-foreground">No image generated</p>
                    </div>
                  )}

                  {/* Panel Number */}
                  <div className="absolute top-2 left-2">
                    <Badge className="bg-primary text-primary-foreground">
                      {index + 1}
                    </Badge>
                  </div>
                  {/* Dialogue Bubble */}
                  {showDialogue && panel.dialogue && !panel.isGenerating && panel.imageUrl && (
                    <div
                      className={`text-sm text-center font-bold shadow-lg backdrop-blur-sm ${getFontClass(config.speechBubbleFont)}`}
                      style={dialogueBubbleStyle}
                    >
                      {panel.dialogue}
                    </div>
                  )}
                </div>

                {/* Panel Info below the image */}
                <div className="text-xs text-muted-foreground space-y-2 px-1">
                  <div>
                    <h4 className="font-bold text-sm text-foreground mb-1">Scene Description</h4>
                    <p>{panel.sceneDescription}</p>
                  </div>

                  {panel.promptUsed && (
                    <div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <h4 className="font-bold text-sm text-foreground mb-1 cursor-help">Prompt Used (truncated)</h4>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-md">
                            <p>{panel.promptUsed}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <p className="line-clamp-2">{panel.promptUsed}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Edit Panel Dialog */}
        <Dialog open={editingPanel !== null} onOpenChange={() => setEditingPanel(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Panel</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Scene Description</label>
                <Textarea
                  value={editData.sceneDescription || ""}
                  onChange={(e) => setEditData(prev => ({ ...prev, sceneDescription: e.target.value }))}
                  className="min-h-[80px]"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Dialogue</label>
                <Input
                  value={editData.dialogue || ""}
                  onChange={(e) => setEditData(prev => ({ ...prev, dialogue: e.target.value }))}
                />
              </div>
              
              <div className="flex space-x-2">
                <Button onClick={saveEdit} className="flex-1">
                  Save Changes
                </Button>
                <Button variant="outline" onClick={() => setEditingPanel(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
