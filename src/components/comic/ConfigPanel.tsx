import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Settings, Palette, Zap } from "lucide-react";
import { ComicConfig } from "@/types/comic";

interface ConfigPanelProps {
  config: ComicConfig;
  onConfigChange: (config: ComicConfig) => void;
}

export const ConfigPanel = ({ config, onConfigChange }: ConfigPanelProps) => {
  const updateConfig = (updates: Partial<ComicConfig>) => {
    onConfigChange({ ...config, ...updates });
  };

  return (
    <Card className="bg-cyber-card border-accent">
      <CardHeader>
        <CardTitle className="text-accent flex items-center">
          <Settings className="w-5 h-5 mr-2" />
          AI Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* AI Models */}
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">Text AI</Label>
            <Select value={config.textAI} onValueChange={(value: any) => updateConfig({ textAI: value })}>
              <SelectTrigger className="bg-muted/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="deepseek">DeepSeek V3</SelectItem>
                <SelectItem value="deepseek-reasoning">DeepSeek R1 0528 (Reasoning)</SelectItem>
                <SelectItem value="grok">xAI Grok-3 Mini</SelectItem>
                <SelectItem value="llamascout">Llama 4 Scout 17B</SelectItem>
                <SelectItem value="mistral">Mistral Small 3.1 24B</SelectItem>
                <SelectItem value="openai">OpenAI GPT-4.1 Mini</SelectItem>
                <SelectItem value="openai-audio">OpenAI GPT-4o Audio Preview</SelectItem>
                <SelectItem value="openai-fast">OpenAI GPT-4.1 Nano</SelectItem>
                <SelectItem value="openai-large">OpenAI GPT-4.1</SelectItem>
                <SelectItem value="openai-reasoning">OpenAI O3 (Reasoning)</SelectItem>
                <SelectItem value="openai-roblox">OpenAI GPT-4.1 Mini (Roblox)</SelectItem>
                <SelectItem value="phi">Phi-4 Mini Instruct</SelectItem>
                <SelectItem value="qwen-coder">Qwen 2.5 Coder 32B</SelectItem>
                <SelectItem value="searchgpt">OpenAI GPT-4o Mini Search</SelectItem>
                <SelectItem value="bidara">BIDARA (NASA Bio Assistant)</SelectItem>
                <SelectItem value="elixposearch">Elixpo Search</SelectItem>
                <SelectItem value="evil">Evil (Uncensored)</SelectItem>
                <SelectItem value="hypnosis-tracy">Hypnosis Tracy</SelectItem>
                <SelectItem value="midijourney">MIDIjourney</SelectItem>
                <SelectItem value="mirexa">Mirexa AI Companion</SelectItem>
                <SelectItem value="rtist">Rtist</SelectItem>
                <SelectItem value="sur">Sur AI Assistant</SelectItem>
                <SelectItem value="unity">Unity Unrestricted Agent</SelectItem>
                <SelectItem value="gemini-2.0-pro">Gemini 2.0 Pro</SelectItem>
                <SelectItem value="gemini-2.0-flash">Gemini 2.0 Flash</SelectItem>
                <SelectItem value="gemini-2.0-flash-lite-preview">Gemini 2.0 Flash Lite Preview</SelectItem>
                <SelectItem value="gemini-2.0-flash-native-audio">Gemini 2.0 Flash Native Audio</SelectItem>
                <SelectItem value="gemini-2.0-flash-preview-tts">Gemini 2.0 Flash Preview TTS</SelectItem>
                <SelectItem value="gemini-2.0-pro-preview-tts">Gemini 2.0 Pro Preview TTS</SelectItem>
                <SelectItem value="gemini-1.5-flash">Gemini 1.5 Flash</SelectItem>
                <SelectItem value="gemini-1.5-flash-8b">Gemini 1.5 Flash 8B</SelectItem>
                <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro</SelectItem>
                <SelectItem value="gemini-live-2.0-flash">Gemini Live 2.0 Flash</SelectItem>
                <SelectItem value="gemini-live-2.0-flash-001">Gemini Live 2.0 Flash 001</SelectItem>
                <SelectItem value="gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
                <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                <SelectItem value="gemini-2.5-flash-lite-preview">Gemini 2.5 Flash Lite Preview</SelectItem>
                <SelectItem value="gemini-2.5-flash-native-audio">Gemini 2.5 Flash Native Audio</SelectItem>
                <SelectItem value="gemini-2.5-flash-preview-tts">Gemini 2.5 Flash Preview TTS</SelectItem>
                <SelectItem value="gemini-2.5-pro-preview-tts">Gemini 2.5 Pro Preview TTS</SelectItem>
                <SelectItem value="gemini">Google Gemini (Legacy)</SelectItem>
                <SelectItem value="huggingface">HuggingFace</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">Image AI</Label>
            <Select value={config.imageAI} onValueChange={(value: any) => updateConfig({ imageAI: value })}>
              <SelectTrigger className="bg-muted/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="flux">Flux (Pollinations)</SelectItem>
                <SelectItem value="kontext">Kontext (Pollinations)</SelectItem>
                <SelectItem value="turbo">Turbo (Pollinations)</SelectItem>
                <SelectItem value="gptimage">GPT Image (Pollinations)</SelectItem>
                <SelectItem value="pollinations">Pollinations.ai Default</SelectItem>
                <SelectItem value="gemini-2.0-flash-image-generation">Gemini 2.0 Flash Image Generation</SelectItem>
                <SelectItem value="imagen-3.0-generate">Imagen 3.0 Generate</SelectItem>
                <SelectItem value="imagen-3.0-ultra-generate">Imagen 3.0 Ultra Generate</SelectItem>
                <SelectItem value="ver-2.0-generate">Ver 2.0 Generate</SelectItem>
                <SelectItem value="gemini-embeddings">Gemini Text Embeddings</SelectItem>
                <SelectItem value="huggingface">HuggingFace SDXL</SelectItem>
                <SelectItem value="gemini">Gemini Imagen (Legacy)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Visual Style */}
        <div>
          <Label className="text-sm font-medium mb-2 block flex items-center">
            <Palette className="w-4 h-4 mr-1" />
            Visual Style
          </Label>
          <Select value={config.style} onValueChange={(value: any) => updateConfig({ style: value })}>
            <SelectTrigger className="bg-muted/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cyberpunk">Cyberpunk</SelectItem>
              <SelectItem value="3d">3D Rendered</SelectItem>
              <SelectItem value="photorealistic">Photorealistic</SelectItem>
              <SelectItem value="manga">Manga</SelectItem>
              <SelectItem value="western">Western Comic</SelectItem>
              <SelectItem value="golden-age">Golden Age</SelectItem>
              <SelectItem value="modern">Modern Age</SelectItem>
              <SelectItem value="anime">Anime Style</SelectItem>
              <SelectItem value="noir">Film Noir</SelectItem>
              <SelectItem value="pop-art">Pop Art</SelectItem>
              <SelectItem value="pixel-art">Pixel Art</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Page Count, Aspect Ratio & Panel Count */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">Page Count</Label>
            <Input
              type="number"
              min={1}
              max={200}
              value={config.pageCount}
              onChange={(e) => updateConfig({ pageCount: Math.min(200, Math.max(1, parseInt(e.target.value) || 1)) })}
              className="bg-muted/50"
            />
          </div>
          <div>
            <Label className="text-sm font-medium mb-2 block">Aspect Ratio</Label>
            <Select value={config.aspectRatio} onValueChange={(value: any) => updateConfig({ aspectRatio: value })}>
              <SelectTrigger className="bg-muted/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1:1">Square (1:1)</SelectItem>
                <SelectItem value="4:3">Standard (4:3)</SelectItem>
                <SelectItem value="3:4">Portrait (3:4)</SelectItem>
                <SelectItem value="16:9">Widescreen (16:9)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">Panel Count</Label>
            <Input
              type="number"
              min={1}
              max={9}
              value={config.panelCount}
              onChange={(e) => updateConfig({ panelCount: Math.min(9, Math.max(1, parseInt(e.target.value) || 1)) })}
              className="bg-muted/50"
            />
          </div>
        </div>

        {/* Advanced Options */}
        <div className="space-y-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium flex items-center">
              <Zap className="w-4 h-4 mr-1" />
              Prompt Booster
            </Label>
            <Switch
              checked={config.promptBooster}
              onCheckedChange={(checked) => updateConfig({ promptBooster: checked })}
            />
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">Random Seed (optional)</Label>
            <Input
              type="number"
              placeholder="Leave empty for random"
              value={config.seed || ""}
              onChange={(e) => updateConfig({ seed: e.target.value ? parseInt(e.target.value) : null })}
              className="bg-muted/50"
            />
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">Speech Bubble Font</Label>
            <Select value={config.speechBubbleFont} onValueChange={(value: any) => updateConfig({ speechBubbleFont: value })}>
              <SelectTrigger className="bg-muted/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="comic-sans">Comic Sans</SelectItem>
                <SelectItem value="anime">Anime Style</SelectItem>
                <SelectItem value="gothic">Gothic</SelectItem>
                <SelectItem value="modern">Modern</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};