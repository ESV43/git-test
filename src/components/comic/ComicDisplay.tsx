import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BookOpen, Edit, RotateCcw, Maximize, Eye, EyeOff, Download } from "lucide-react";
import { ComicPanel, ComicConfig } from "@/types/comic";

interface ComicDisplayProps {
  panels: ComicPanel[];
  onPanelsChange: (panels: ComicPanel[]) => void;
  config: ComicConfig;
}

export const ComicDisplay = ({ panels, onPanelsChange, config }: ComicDisplayProps) => {
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
    
    const updatedPanels = panels.map(panel => 
      panel.id === editingPanel 
        ? { ...panel, ...editData }
        : panel
    );
    
    onPanelsChange(updatedPanels);
    setEditingPanel(null);
    setEditData({});
  };

  const regeneratePanel = (panelId: string) => {
    // Mark panel as regenerating
    const updatedPanels = panels.map(panel => 
      panel.id === panelId 
        ? { ...panel, isGenerating: true }
        : panel
    );
    onPanelsChange(updatedPanels);
    
    // Simulate regeneration
    setTimeout(() => {
      const finalPanels = panels.map(panel => 
        panel.id === panelId 
          ? { 
              ...panel, 
              isGenerating: false,
              imageUrl: `https://picsum.photos/800/600?random=${Date.now()}`
            }
          : panel
      );
      onPanelsChange(finalPanels);
    }, 3000);
  };

  const getGridCols = () => {
    if (panels.length === 1) return "grid-cols-1";
    if (panels.length === 2) return "grid-cols-1 md:grid-cols-2";
    if (panels.length <= 4) return "grid-cols-1 md:grid-cols-2";
    if (panels.length <= 6) return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
    return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
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
              <div key={panel.id} className="space-y-3">
                {/* Panel Image */}
                <div className="relative group bg-muted/30 rounded-lg overflow-hidden border border-border aspect-[4/3]">
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
                                <div className="p-4 bg-muted/50 rounded-lg">
                                  <p className="font-medium">{panel.dialogue}</p>
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
                </div>
                
                {/* Dialogue Bubble */}
                {showDialogue && panel.dialogue && (
                  <div className="relative bg-muted/30 p-3 rounded-lg border border-border">
                    <div className="absolute -top-2 left-4 w-4 h-4 bg-muted/30 border-l border-t border-border transform rotate-45"></div>
                    <p className="text-sm font-medium">{panel.dialogue}</p>
                  </div>
                )}
                
                {/* Panel Info */}
                <div className="text-xs text-muted-foreground space-y-1">
                  <p><strong>Scene:</strong> {panel.sceneDescription}</p>
                  {panel.promptUsed && (
                    <p><strong>Prompt:</strong> {panel.promptUsed.slice(0, 100)}...</p>
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