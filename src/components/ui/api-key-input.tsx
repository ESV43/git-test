import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Key, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

interface APIKeyInputProps {
  onKeysChange: (keys: { gemini?: string[]; huggingface?: string }) => void;
  currentKeys: { gemini?: string[]; huggingface?: string };
}

export const APIKeyInput = ({ onKeysChange, currentKeys }: APIKeyInputProps) => {
  const [showGemini, setShowGemini] = useState(false);
  const [showHuggingface, setShowHuggingface] = useState(false);
  const [geminiKeys, setGeminiKeys] = useState(Array.isArray(currentKeys.gemini) ? currentKeys.gemini.join('\n') : "");
  const [huggingfaceKey, setHuggingfaceKey] = useState(currentKeys.huggingface || "");

  const handleSave = () => {
    const keys: { gemini?: string[]; huggingface?: string } = {};
    if (geminiKeys.trim()) keys.gemini = geminiKeys.trim().split('\n').filter(k => k.trim());
    if (huggingfaceKey.trim()) keys.huggingface = huggingfaceKey.trim();
    
    onKeysChange(keys);
    toast.success("API keys updated successfully!");
  };

  return (
    <Card className="bg-cyber-card border-accent">
      <CardHeader>
        <CardTitle className="text-accent flex items-center">
          <Key className="w-5 h-5 mr-2" />
          API Keys Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-sm font-medium mb-2 block">
            Gemini API Keys (one per line)
          </Label>
          <div className="flex">
            {showGemini ? (
              <Textarea
                placeholder="Enter your Gemini API keys, one per line"
                value={geminiKeys}
                onChange={(e) => setGeminiKeys(e.target.value)}
                className="bg-muted/50 flex-1 min-h-[80px]"
              />
            ) : (
              <Input
                type="password"
                placeholder="Multiple keys configured"
                value={geminiKeys.length > 0 ? "•".repeat(10) : ""}
                readOnly
                className="bg-muted/50 flex-1"/>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowGemini(!showGemini)}
              className="ml-2"
            >
              {showGemini ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium mb-2 block">
            HuggingFace API Key (optional)
          </Label>
          <div className="flex">
            <Input
              type={showHuggingface ? "text" : "password"}
              placeholder="Enter your HuggingFace API key"
              value={huggingfaceKey}
              onChange={(e) => setHuggingfaceKey(e.target.value)}
              className="bg-muted/50 flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowHuggingface(!showHuggingface)}
              className="ml-2"
            >
              {showHuggingface ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <Button onClick={handleSave} className="w-full">
          Save API Keys
        </Button>

        <div className="text-xs text-muted-foreground">
          <p>• Gemini API key is required for Gemini image generation models</p>
          <p>• Keys are stored locally in your browser</p>
          <p>• Get your Gemini API key from: <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-accent underline">Google AI Studio</a></p>
        </div>
      </CardContent>
    </Card>
  );
};
