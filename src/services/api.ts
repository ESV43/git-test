import { ComicConfig, Character, ComicPanel, APIKeys } from "@/types/comic";
import { GoogleGenAI, Modality } from '@google/genai';

// API service for comic generation
export class ComicGeneratorAPI {
  private apiKeys: APIKeys = {};
  private geminiKeyIndex = 0;

  setAPIKeys(keys: APIKeys) {
    this.apiKeys = { ...this.apiKeys, ...keys };
    this.geminiKeyIndex = 0; // Reset index when keys are updated
    // Store in localStorage for persistence
    localStorage.setItem('comic-api-keys', JSON.stringify(keys));
  }

  getAPIKeys(): APIKeys {
    return this.apiKeys;
  }

  // Load API keys from localStorage
  loadAPIKeys() {
    try {
      const stored = localStorage.getItem('comic-api-keys');
      if (stored) {
        this.apiKeys = JSON.parse(stored);
        this.geminiKeyIndex = 0;
      }
    } catch (error) {
      console.warn('Failed to load stored API keys:', error);
    }
  }

  private getNextGeminiKey(): string | null {
    if (!this.apiKeys.gemini || this.apiKeys.gemini.length === 0) {
      return null;
    }
    const key = this.apiKeys.gemini[this.geminiKeyIndex];
    this.geminiKeyIndex = (this.geminiKeyIndex + 1) % this.apiKeys.gemini.length;
    return key;
  }

  // Check if required API key is available for selected model
  hasRequiredAPIKey(model: string): boolean {
    if (model.startsWith('gemini')) {
      return !!this.apiKeys.gemini && this.apiKeys.gemini.length > 0;
    }
    if (model === 'huggingface') {
      return !!this.apiKeys.huggingface && this.apiKeys.huggingface.length > 0;
    }
    // Other models don't require API keys
    return true;
  }

  /**
   * A robust wrapper for making Gemini API calls that automatically retries with the next available key upon failure.
   * @param apiCall - The function that makes the actual API call. It receives an API key and must return a Promise.
   * @returns The result of the successful API call.
   * @throws An error if all available API keys fail.
   */
  private async _callGeminiWithRetry<T>(
    apiCall: (apiKey: string) => Promise<T>
  ): Promise<T> {
    const keys = this.apiKeys.gemini;
    if (!keys || keys.length === 0) {
        throw new Error("No Gemini API keys configured. Please add at least one key.");
    }

    const totalKeys = keys.length;
    for (let i = 0; i < totalKeys; i++) {
        const apiKey = this.getNextGeminiKey();
        if (!apiKey) continue; // Should be unreachable if keys.length > 0

        try {
            const currentKeyIndex = (this.geminiKeyIndex + totalKeys - 1) % totalKeys;
            console.log(`Attempting API call with key index: ${currentKeyIndex}`);
            const result = await apiCall(apiKey);
            return result; // Success!
        } catch (error) {
            const failedKeyIndex = (this.geminiKeyIndex + totalKeys - 1) % totalKeys;
            console.error(`API call failed with key index ${failedKeyIndex}:`, error);
            if (i === totalKeys - 1) {
                // This was the last key, and it failed.
                throw new Error("All available Gemini API keys failed. Please check your keys and API limits.");
            }
            // Otherwise, the loop will continue to the next key.
        }
    }

    // This should be unreachable, but acts as a fallback.
    throw new Error("Failed to execute API call after trying all keys.");
  }


  // Dynamic image generation based on selected AI model with auto-fallback
  async generateImage(prompt: string, config: ComicConfig, characters?: Character[]): Promise<string> {
    const enhancedPrompt = this.buildImagePrompt(prompt, config, characters);
    const currentModel = config.imageAI;
    
    try {
      // Route to appropriate image generation service
      if (currentModel.startsWith('gemini')) {
        return await this.generateImageWithGemini(enhancedPrompt, config, characters);
      } else if (currentModel === 'huggingface') {
        if (!this.apiKeys.huggingface) {
          throw new Error('HuggingFace API key is required. Please configure your API key.');
        }
        return await this.generateImageWithHuggingFace(enhancedPrompt);
      } else {
        // Pollinations.ai models (flux, kontext, turbo, gptimage, pollinations)
        return await this.generateImageWithPollinations(enhancedPrompt, config);
      }
    } catch (error) {
      console.error(`Image generation failed with ${currentModel}:`, error);
      throw error;
    }
  }

  // Pollinations.ai image generation
  async generateImageWithPollinations(prompt: string, config: ComicConfig): Promise<string> {
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`;
    
    // Map imageAI config to Pollinations model names
    const modelMap: { [key: string]: string } = {
      'flux': 'flux',
      'kontext': 'kontext',
      'turbo': 'turbo',
      'gptimage': 'gptimage',
      'pollinations': 'flux' // default to flux
    };
    
    const model = modelMap[config.imageAI] || 'flux';
    
    const params = new URLSearchParams({
      width: this.getImageDimensions(config.aspectRatio).width.toString(),
      height: this.getImageDimensions(config.aspectRatio).height.toString(),
      model: model,
      ...(config.seed && { seed: config.seed.toString() })
    });

    return `${url}?${params.toString()}`;
  }

  // Gemini image generation using Google GenAI
  private async generateImageWithGemini(prompt: string, config: ComicConfig, characters?: Character[]): Promise<string> {
    return this._callGeminiWithRetry(async (apiKey) => {
        const genAI = new GoogleGenAI({ apiKey });
        const chat = genAI.chats.create({
            model: 'gemini-2.0-flash-preview-image-generation',
            config: { responseModalities: [Modality.TEXT, Modality.IMAGE] },
            history: [],
        });

        const messageParts: (string | { inlineData: { data: string, mimeType: string }})[] = [{ text: prompt }];

        if (characters && characters.length > 0) {
            for (const char of characters) {
                if (prompt.toLowerCase().includes(char.name.toLowerCase()) && (char.images.length > 0 || (char.previewImages && char.previewImages.length > 0))) {
                    const refImages = (char.previewImages && char.previewImages.length > 0) ? char.previewImages : char.images;
                    for (const imgDataUrl of refImages) {
                        const base64Data = imgDataUrl.split(',')[1];
                        messageParts.push({ inlineData: { data: base64Data, mimeType: 'image/png' } });
                    }
                }
            }
        }

        const result = await chat.sendMessageStream({ message: messageParts });
        for await (const chunk of result) {
            for (const candidate of chunk.candidates) {
                for (const part of candidate.content.parts ?? []) {
                    if (part.inlineData?.data) {
                        return `data:image/png;base64,${part.inlineData.data}`;
                    }
                }
            }
        }
        throw new Error('No image generated by Gemini in response stream.');
    });
  }

  // Analyze story and generate comic script using selected AI model
  async analyzeStoryToScript(story: string, config: ComicConfig): Promise<string> {
    if (!this.hasRequiredAPIKey(config.textAI)) {
      throw new Error(`API key required for ${config.textAI}. Please configure your API key.`);
    }

    try {
      const prompt = `You are a professional comic book scriptwriter. Your task is to adapt the following story into a detailed comic script.

**Instructions:**
1.  Divide the story into ${config.pageCount} pages.
2.  Each page must contain exactly ${config.panelCount} panels.
3.  For each panel, provide the following details, clearly labeled:
    *   **PAGE:** The page number.
    *   **PANEL:** The panel number on that page.
    *   **SCENE:** A detailed description of the setting, characters, and their actions. Be very descriptive for the image generation AI. Include camera angles (e.g., "Close-up on," "Wide shot of," "Over-the-shoulder view").
    *   **DIALOGUE:** Any dialogue spoken by characters in that panel. Format it as "CHARACTER NAME: Dialogue text." If there's no dialogue, write "DIALOGUE: (none)".

**Visual Style:** The overall tone and visuals should match a "${config.style}" comic book.

**Story to Adapt:**\n---\n${story}\n---\n\nProduce the complete script following these instructions precisely.`;

      if (config.textAI.startsWith('gemini')) {
        return await this.callGeminiTextAPI(prompt);
      } else {
        // For other models, use a basic conversion for now
        return this.convertStoryToBasicScript(story, config);
      }
    } catch (error) {
      console.error('Story analysis failed:', error);
      throw new Error('Failed to analyze story. Please check your API key and try again.');
    }
  }

  // Gemini text API call
  private async callGeminiTextAPI(prompt: string): Promise<string> {
    return this._callGeminiWithRetry(async (apiKey) => {
        const genAI = new GoogleGenAI({ apiKey });
        const chat = genAI.chats.create({
            model: 'gemini-2.0-flash-preview',
            history: [],
        });
        const result = await chat.sendMessage({ message: prompt });
        return result.text;
    });
  }

  // Basic story conversion for non-Gemini models
  private convertStoryToBasicScript(story: string, config: ComicConfig): string {
    const paragraphs = story.split(/\n\s*\n/).filter(p => p.trim());
    const totalPanels = config.pageCount * config.panelCount;
    
    let script = `Comic Script - ${config.pageCount} Pages, ${config.panelCount} Panels Each\n\n`;
    
    for (let i = 0; i < totalPanels; i++) {
      const paragraphIndex = i % paragraphs.length;
      const paragraph = paragraphs[paragraphIndex] || 'Comic scene continues...';
      const pageNum = Math.floor(i / config.panelCount) + 1;
      const panelNum = (i % config.panelCount) + 1;
      
      script += `Page ${pageNum}, Panel ${panelNum}:\n`;
      script += `Scene: ${paragraph.substring(0, 200)}...\n`;
      script += `Visual: ${config.style} style illustration of the scene\n\n`;
    }
    
    return script;
  }

  // Script processing - generates panels for all pages using selected AI model
  async processScript(script: string, config: ComicConfig): Promise<ComicPanel[]> {
    try {
      // Enhanced script processing using selected text AI model when available
      let processedScript = script;
      
      if (this.hasRequiredAPIKey(config.textAI) && config.textAI.startsWith('gemini')) {
        try {
          const enhancementPrompt = `Enhance this comic script for better visual storytelling. Break it into ${config.pageCount} pages with ${config.panelCount} panels each. For each panel, provide clear scene descriptions and dialogue. Style: ${config.style}

Original script:
${script}`;
          
          processedScript = await this.callGeminiTextAPI(enhancementPrompt);
        } catch (error) {
          console.warn('Script enhancement failed, using original script:', error);
        }
      }
      
      const scenes = this.parseScriptIntoScenes(processedScript);
      const panels: ComicPanel[] = [];
      
      // Calculate total panels needed (pages * panels per page)
      const totalPanels = config.pageCount * config.panelCount;
      
      // Generate panels, repeating/extending scenes if needed
      for (let i = 0; i < totalPanels; i++) {
        const sceneIndex = i % scenes.length;
        const scene = scenes[sceneIndex] || { description: 'Comic panel scene', dialogue: '' };
        const pageNumber = Math.floor(i / config.panelCount) + 1;
        const panelNumber = (i % config.panelCount) + 1;
        
        panels.push({
          id: `page-${pageNumber}-panel-${panelNumber}`,
          sceneDescription: scene.description,
          dialogue: scene.dialogue
        });
      }
      
      return panels;
    } catch (error) {
      console.error('Script processing failed:', error);
      throw new Error('Failed to process script');
    }
  }

  // Generate images for all panels across all pages
  async generateComicPanels(
    panels: ComicPanel[],
    config: ComicConfig,
    characters: Character[],
    onProgress?: (current: number, total: number, status: string) => void
  ): Promise<ComicPanel[]> {
    const generatedPanels: ComicPanel[] = [];

    for (let i = 0; i < panels.length; i++) {
      const panel = panels[i];
      const pageNumber = Math.floor(i / config.panelCount) + 1;
      const panelNumber = (i % config.panelCount) + 1;
      
      onProgress?.(i, panels.length, `Generating page ${pageNumber}, panel ${panelNumber} using ${config.imageAI}...`);
      
      try {
        const imageUrl = await this.generateImage(panel.sceneDescription, config, characters);
        const promptUsed = this.buildImagePrompt(panel.sceneDescription, config, characters);
        
        generatedPanels.push({
          ...panel,
          imageUrl,
          promptUsed: promptUsed
        });
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`Failed to generate panel ${i + 1}:`, error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        generatedPanels.push({
          ...panel,
          error: `Generation Failed: ${errorMessage}`
        });
      }
    }

    onProgress?.(panels.length, panels.length, 'Complete!');
    return generatedPanels;
  }

  // HuggingFace API integration (alternative image generation)
  async generateImageWithHuggingFace(prompt: string): Promise<string> {
    if (!this.apiKeys.huggingface) {
      throw new Error('HuggingFace API key not set');
    }

    const response = await fetch(
      'https://api-inference.huggingface.co/models/runwayml/stable-diffusion-v1-5',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKeys.huggingface}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            num_inference_steps: 30,
            guidance_scale: 7.5,
          }
        }),
      }
    );

    if (!response.ok) {
      throw new Error('HuggingFace API request failed');
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }

  // Helper methods
  private parseScriptIntoScenes(script: string): Array<{ description: string; dialogue: string }> {
    const scenes: Array<{ description: string; dialogue: string }> = [];
    
    // Regex to capture PAGE, PANEL, SCENE, and DIALOGUE blocks
    const panelRegex = /PAGE:\s*\d+,\s*PANEL:\s*\d+\s*SCENE:(.*?)\s*DIALOGUE:(.*)/gis;
    let match;
    while ((match = panelRegex.exec(script)) !== null) {
        let description = match[1].trim();
        let dialogue = match[2].trim();

        if (dialogue.toLowerCase() === '(none)') {
            dialogue = '';
        }
        scenes.push({ description, dialogue });
    }

    // Fallback for simpler formats
    if (scenes.length === 0) {
        const paragraphs = script.split(/\n\s*\n/).filter(p => p.trim());
        for (const paragraph of paragraphs) {
            const lines = paragraph.split('\n').map(line => line.trim()).filter(Boolean);
            if (lines.length === 0) continue;

            let description = '';
            let dialogue = '';

            for (const line of lines) {
                if (line.match(/^[A-Z\s]+:/) || line.startsWith('"')) {
                    dialogue += line + ' ';
                } else {
                    description += line + ' ';
                }
            }
            scenes.push({ description: description.trim() || 'Comic panel scene', dialogue: dialogue.trim() });
        }
    }

    return scenes;
  }

  buildImagePrompt(basePrompt: string, config: ComicConfig, characters?: Character[]): string {
    let prompt = basePrompt;
  
    const styleModifiers: { [key: string]: { positive: string, negative?: string } } = {
        cyberpunk: {
            positive: 'cyberpunk style, neon lights, futuristic city, dark atmosphere, gritty, high-tech low-life, Blade Runner aesthetic, cinematic lighting',
            negative: 'daytime, bright, clean, minimalist'
        },
        '3d': {
            positive: '3D rendered, CGI, octane render, unreal engine, volumetric lighting, detailed textures, realistic materials, trending on artstation',
            negative: '2D, flat, drawing, painting'
        },
        photorealistic: {
            positive: 'photograph, photorealistic, 8k, DSLR, sharp focus, high detail, cinematic lighting, f/1.8, 85mm lens',
            negative: 'drawing, painting, illustration, cartoon, 3d render, anime'
        },
        manga: {
            positive: 'manga style, black and white, screentones, sharp lines, dynamic composition, japanese comic art, detailed ink drawing',
            negative: 'color, photorealistic, 3d, painting'
        },
        western: {
            positive: 'western comic book style, bold colors, action lines, superhero comic art, marvel comics, dc comics, dynamic poses',
            negative: 'black and white, manga, realistic'
        },
        'golden-age': {
            positive: 'golden age comics style, vintage, retro, 1940s comic art, pulpy, four-color process, aged paper texture',
            negative: 'modern, digital art, clean lines'
        },
        modern: {
            positive: 'modern comic book style, detailed pencils and inks, digital coloring, cinematic, vibrant, sharp lines',
            negative: 'vintage, black and white, sketch'
        },
        anime: {
            positive: 'anime film screenshot, Studio Ghibli style, Makoto Shinkai style, cel-shaded, vibrant colors, detailed background',
            negative: 'realistic, 3d, western cartoon'
        },
        noir: {
            positive: 'film noir style, black and white, high contrast, dramatic shadows, moody, 1950s detective movie, dutch angle',
            negative: 'color, bright, cheerful'
        },
        'pop-art': {
            positive: 'pop art style, Andy Warhol, Roy Lichtenstein, bold colors, ben-day dots, graphic, thick outlines',
            negative: 'realistic, subtle colors, gradients'
        },
        'pixel-art': {
            positive: '16-bit pixel art, retro gaming aesthetic, pixelated, sprite art, detailed, vibrant color palette',
            negative: 'smooth, vector, realistic, high resolution'
        }
    };
  
    if (styleModifiers[config.style]) {
        const style = styleModifiers[config.style];
        prompt = `(${style.positive}:1.4), ${prompt}`;
        if (style.negative) {
            prompt += ` --no ${style.negative}`;
        }
    }
  
    prompt += ', comic book panel, high quality, detailed art';
  
    if (config.promptBooster) {
        prompt += ', masterpiece, best quality, ultra detailed, cinematic composition';
    }
  
    if (characters && characters.length > 0) {
        const characterContext = characters.map(c => {
            if (basePrompt.toLowerCase().includes(c.name.toLowerCase())) {
                return `${c.name} appears as described: ${c.description || 'no description'}.`;
            }
            return null;
        }).filter(Boolean).join(' ');
  
        if (characterContext) {
            prompt += ` | Character details: ${characterContext}`;
        }
    }
  
    return prompt;
  }

  // Generate character preview using Gemini 2.0 Flash Image Generation with image input
  async generateCharacterPreview(referenceImageData: string, description: string, style?: string): Promise<string> {
    return this._callGeminiWithRetry(async (apiKey) => {
        const genAI = new GoogleGenAI({ apiKey });
        const chat = genAI.chats.create({
            model: 'gemini-2.0-flash-preview-image-generation',
            config: { responseModalities: [Modality.TEXT, Modality.IMAGE] },
            history: [],
        });

        const base64Data = referenceImageData.split(',')[1];
        const stylePrompt = style ? ` in ${style} comic book style` : ' in comic book style';
        const prompt = `Re-draw this character based on the provided image and description, but in your own artistic interpretation for a comic book. **Strictly maintain all key features, clothing, and colors from the reference image.** The goal is to see how you, the AI, would draw this character for a comic. Description: ${description}. The final image must be a high-quality, detailed character portrait suitable for a comic book.${stylePrompt}`;

        const result = await chat.sendMessageStream({
            message: [{ text: prompt }, { inlineData: { data: base64Data, mimeType: 'image/png' } }]
        });

        for await (const chunk of result) {
            for (const candidate of chunk.candidates) {
                for (const part of candidate.content.parts ?? []) {
                    if (part.inlineData?.data) {
                        return `data:image/png;base64,${part.inlineData.data}`;
                    }
                }
            }
        }
        throw new Error('No character preview generated by Gemini');
    });
  }

  private getImageDimensions(aspectRatio: string): { width: number; height: number } {
    switch (aspectRatio) {
      case '1:1': return { width: 800, height: 800 };
      case '4:3': return { width: 800, height: 600 };
      case '3:4': return { width: 600, height: 800 };
      case '16:9': return { width: 1024, height: 576 };
      default: return { width: 800, height: 600 };
    }
  }
}

// Export singleton instance
export const comicAPI = new ComicGeneratorAPI();
