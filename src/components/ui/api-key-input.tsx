import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Key, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface APIKeyInputProps {
  onKeysChange: (keys: { gemini?: string[]; huggingface?: string }) => void;
  currentKeys: { gemini?: string[]; huggingface?: string };
}

// Helper function to mask API keys for display
const maskKey = (key: string) => {
  if (key.length <= 8) return "••••••••";
  return `${key.slice(0, 4)}••••••••••••••••••••${key.slice(-4)}`;
};

export const APIKeyInput = ({ onKeysChange, currentKeys }: APIKeyInputProps) => {
  const [geminiKeysList, setGeminiKeysList] = useState<string[]>([]);
  const [newGeminiKey, setNewGeminiKey] = useState("");
  const [huggingfaceKey, setHuggingfaceKey] = useState("");
  const [showKeys, setShowKeys] = useState(false);

  // Sync with parent state when the component mounts or currentKeys change
  useEffect(() => {
    setGeminiKeysList(currentKeys.gemini || []);
    setHuggingfaceKey(currentKeys.huggingface || "");
  }, [currentKeys]);

  const handleAddGeminiKey = () => {
    const trimmedKey = newGeminiKey.trim();
    if (!trimmedKey) {
      toast.error("API key field cannot be empty.");
      return;
    }
    if (geminiKeysList.includes(trimmedKey)) {
      toast.warning("This API key has already been added.");
      return;
    }

    const updatedKeys = [...geminiKeysList, trimmedKey];
    setGeminiKeysList(updatedKeys);
    onKeysChange({ gemini: updatedKeys, huggingface: huggingfaceKey });
    setNewGeminiKey("");
    toast.success("Gemini API key added successfully.");
  };

  const handleDeleteGeminiKey = (keyToDelete: string) => {
    const updatedKeys = geminiKeysList.filter(key => key !== keyToDelete);
    setGeminiKeysList(updatedKeys);
    onKeysChange({ gemini: updatedKeys, huggingface: huggingfaceKey });
    toast.success("Gemini API key removed.");
  };
  
  const handleHuggingfaceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHfKey = e.target.value;
    setHuggingfaceKey(newHfKey);
    onKeysChange({ gemini: geminiKeysList, huggingface: newHfKey });
  }

  return (
    <Card className="bg-cyber-card border-accent">
      <CardHeader>
        <CardTitle className="text-accent flex items-center">
          <Key className="w-5 h-5 mr-2" />
          API Keys Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Gemini Keys Section */}
        <div>
          <Label className="text-sm font-medium mb-2 block">
            Gemini API Keys (for key rotation)
          </Label>
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder="Enter new Gemini API key"
              value={newGeminiKey}
              onChange={(e) => setNewGeminiKey(e.target.value)}
              className="bg-muted/50"
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddGeminiKey()}}
            />
            <Button onClick={handleAddGeminiKey} variant="secondary">
                <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </div>

          <div className="mt-4 space-y-2">
            {geminiKeysList.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg">
                No Gemini keys added.
              </p>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-end">
                  <Button variant="ghost" size="sm" onClick={() => setShowKeys(!showKeys)} className="h-7">
                    {showKeys ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
                    {showKeys ? "Hide Keys" : "Show Keys"}
                  </Button>
                </div>
                {geminiKeysList.map((key, index) => (
                  <div key={index} className="flex items-center justify-between p-2 pl-4 bg-muted/30 rounded-md">
                    <span className="font-mono text-xs break-all">
                      {showKeys ? key : maskKey(key)}
                    </span>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8" onClick={() => handleDeleteGeminiKey(key)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Hugging Face Key Section */}
        <div>
          <Label className="text-sm font-medium mb-2 block">
            HuggingFace API Key (optional)
          </Label>
          <Input
            type="password"
            placeholder="Enter your HuggingFace API key"
            value={huggingfaceKey}
            onChange={handleHuggingfaceChange}
            className="bg-muted/50"
          />
        </div>

        <div className="text-xs text-muted-foreground pt-4 border-t border-border/50">
          <p>• Add multiple Gemini keys to enable automatic rotation for large jobs.</p>
          <p>• Keys are stored securely in your browser's local storage.</p>
          <p>• Get your Gemini API key from: <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-accent underline hover:text-accent/80">Google AI Studio</a></p>
        </div>
      </CardContent>
    </Card>
  );
};
