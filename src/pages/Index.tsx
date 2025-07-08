import { useState, useEffect } from "react";
import { Header } from "@/components/comic/Header";
import { ScriptInput } from "@/components/comic/ScriptInput";
import { StoryInput } from "@/components/comic/StoryInput";
import { ConfigPanel } from "@/components/comic/ConfigPanel";
import { CharacterBank } from "@/components/comic/CharacterBank";
import { ComicDisplay } from "@/components/comic/ComicDisplay";
import { ExportPanel } from "@/components/comic/ExportPanel";
import { GenerationStatus } from "@/components/comic/GenerationStatus";
import { APIKeyInput } from "@/components/ui/api-key-input";
import { Character, ComicConfig, ComicPanel, APIKeys } from "@/types/comic";
import { comicAPI } from "@/services/api";
import { toast } from "sonner";

const Index = () => {
  const [script, setScript] = useState("");
  const [config, setConfig] = useState<ComicConfig>({
    textAI: "openai", // You can change this to a Gemini model if you prefer
    imageAI: "gemini-2.0-flash-image-generation",
    style: "cyberpunk",
    aspectRatio: "16:9",
    panelCount: 4,
    pageCount: 1,
    seed: null,
    promptBooster: true,
    speechBubbleFont: "comic-sans"
  });
  const [characters, setCharacters] = useState<Character[]>([]);
  const [panels, setPanels] = useState<ComicPanel[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0, status: "" });
  const [apiKeys, setApiKeys] = useState<APIKeys>({});

  // Load API keys on component mount
  useEffect(() => {
    comicAPI.loadAPIKeys();
    setApiKeys({ gemini: comicAPI.getAPIKeys().gemini, huggingface: comicAPI.getAPIKeys().huggingface });
  }, []);

  const handleAPIKeysChange = (keys: { gemini?: string[]; huggingface?: string }) => {
    setApiKeys(keys);
    comicAPI.setAPIKeys(keys);
  };

  const handleGenerate = async () => {
    if (!script.trim()) {
      toast.error("Please enter a script first!");
      return;
    }

    // Check if required API keys are available for selected models
    if (!comicAPI.hasRequiredAPIKey(config.imageAI)) {
      toast.error(`API key is required for ${config.imageAI}. Please configure your API key.`);
      return;
    }
    
    if (!comicAPI.hasRequiredAPIKey(config.textAI)) {
      toast.error(`API key is required for ${config.textAI}. Please configure your API key.`);
      return;
    }
    
    setIsGenerating(true);
    const totalPanels = config.pageCount * config.panelCount;
    setGenerationProgress({ current: 0, total: totalPanels, status: "Processing script..." });
    
    try {
      // Step 1: Process script into panels for ALL pages
      setGenerationProgress({ current: 0, total: totalPanels, status: "Analyzing script..." });
      const processedPanels = await comicAPI.processScript(script, config);
      
      console.log(`Processing ${processedPanels.length} panels across ${config.pageCount} pages (${config.panelCount} panels per page)`);
      
      // Step 2: Generate images for ALL panels
      const finalPanels = await comicAPI.generateComicPanels(
        processedPanels,
        config,
        characters,
        (current, total, status) => {
          setGenerationProgress({ current, total, status });
        }
      );
      
      setPanels(finalPanels);
      toast.success(`Generated ${finalPanels.length} comic panels across ${config.pageCount} pages using ${config.imageAI}!`);
      
    } catch (error) {
      console.error("Generation failed:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to generate comic";
      toast.error(errorMessage);
      setGenerationProgress({ current: 0, total: 0, status: `Error: ${errorMessage}` });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background cyber-grid">
      <Header />
      
      <main className="container mx-auto px-6 py-8 space-y-8">
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left Column - Script & Config */}
          <div className="xl:col-span-1 space-y-6">
            <StoryInput 
              config={config}
              onScriptGenerated={setScript}
            />
            
            <ScriptInput 
              script={script} 
              onScriptChange={setScript}
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
            />
            
            <ConfigPanel 
              config={config} 
              onConfigChange={setConfig} 
            />

            <APIKeyInput 
              onKeysChange={handleAPIKeysChange}
              currentKeys={apiKeys}
            />
            
            <CharacterBank 
              characters={characters} 
              onCharactersChange={setCharacters} 
              config={config}
            />
          </div>
          
          {/* Right Column - Comic Display & Export */}
          <div className="xl:col-span-2 space-y-6">
            {isGenerating && (
              <GenerationStatus progress={generationProgress} />
            )}
            
            <ComicDisplay 
              panels={panels} 
              onPanelsChange={setPanels}
              config={config}
            />
            
            {panels.length > 0 && (
              <ExportPanel panels={panels} config={config} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
