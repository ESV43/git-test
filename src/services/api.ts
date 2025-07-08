import { ComicConfig, Character, ComicPanel } from "@/types/comic";
import { GoogleGenAI, Modality } from '@google/genai';

// API service for comic generation
export class ComicGeneratorAPI {
  private apiKeys: {
    gemini?: string;
    huggingface?: string;
  } = {};

  setAPIKeys(keys: { gemini?: string; huggingface?: string }) {
    this.apiKeys = { ...this.apiKeys, ...keys };
    // Store in localStorage for persistence
    localStorage.setItem('comic-api-keys', JSON.stringify(keys));
  }

  // Load API keys from localStorage
  loadAPIKeys() {
    try {
      const stored = localStorage.getItem('comic-api-keys');
      if (stored) {
        this.apiKeys = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load stored API keys:', error);
    }
  }

  // Check if required API key is available for selected model
  hasRequiredAPIKey(model: string): boolean {
    if (model.startsWith('gemini-2.') || model.startsWith('gemini-1.') || model === 'gemini') {
      return !!this.apiKeys.gemini;
    }
    if (model === 'huggingface') {
      return !!this.apiKeys.huggingface;
    }
    // Other models don't require API keys
    return true;
  }

  private failureCount = new Map<string, number>();
  private readonly MAX_FAILURES = 3;

  // Dynamic image generation based on selected AI model with auto-fallback
  async generateImage(prompt: string, config: ComicConfig): Promise<string> {
    const enhancedPrompt = this.buildImagePrompt(prompt, config);
    const currentModel = config.imageAI;
    
    try {
      // Route to appropriate image generation service
      if (currentModel.startsWith('gemini')) {
        // Block Gemini models if no API key is available
        if (!this.apiKeys.gemini) {
          throw new Error(`Gemini API key is required for ${currentModel}. Please configure your API key.`);
        }
        const result = await this.generateImageWithGemini(enhancedPrompt, config);
        this.failureCount.set(currentModel, 0); // Reset failure count on success
        return result;
      } else if (currentModel === 'huggingface') {
        if (!this.apiKeys.huggingface) {
          throw new Error('HuggingFace API key is required. Please configure your API key.');
        }
        const result = await this.generateImageWithHuggingFace(enhancedPrompt);
        this.failureCount.set(currentModel, 0);
        return result;
      } else {
        // Pollinations.ai models (flux, kontext, turbo, gptimage, pollinations)
        const result = await this.generateImageWithPollinations(enhancedPrompt, config);
        this.failureCount.set(currentModel, 0);
        return result;
      }
    } catch (error) {
      console.error(`Image generation failed with ${currentModel}:`, error);
      
      // Track failures and fallback to Pollinations if needed
      const failures = this.failureCount.get(currentModel) || 0;
      this.failureCount.set(currentModel, failures + 1);
      
      if (failures >= this.MAX_FAILURES && currentModel !== 'flux') {
        console.log(`${currentModel} failed ${this.MAX_FAILURES} times, falling back to Pollinations Flux`);
        const fallbackConfig = { ...config, imageAI: 'flux' as any };
        return await this.generateImageWithPollinations(enhancedPrompt, fallbackConfig);
      }
      
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
  private async generateImageWithGemini(prompt: string, config: ComicConfig): Promise<string> {
    if (!this.apiKeys.gemini) {
      throw new Error('Gemini API key not set. Please configure your API key.');
    }

    try {
      const genAI = new GoogleGenAI({ apiKey: this.apiKeys.gemini });
      
      // Create a chat for image generation
      const chat = genAI.chats.create({
        model: 'gemini-2.0-flash-preview-image-generation',
        config: {
          responseModalities: [Modality.TEXT, Modality.IMAGE],
        },
        history: [],
      });

      const result = await chat.sendMessageStream({
        message: `Generate an image: ${prompt}. Style: comic book panel, high quality, detailed art.`
      });

      // Extract image from response stream
      for await (const chunk of result) {
        for (const candidate of chunk.candidates) {
          for (const part of candidate.content.parts ?? []) {
            if (part.inlineData) {
              const data = part.inlineData;
              if (data && data.data) {
                // Return as data URL
                return `data:image/png;base64,${data.data}`;
              }
            }
          }
        }
      }

      throw new Error('No image generated by Gemini');
    } catch (error) {
      console.error('Gemini image generation failed:', error);
      throw error;
    }
  }

  // Analyze story and generate comic script using selected AI model
  async analyzeStoryToScript(story: string, config: ComicConfig): Promise<string> {
    if (!this.hasRequiredAPIKey(config.textAI)) {
      throw new Error(`API key required for ${config.textAI}. Please configure your API key.`);
    }

    try {
      const prompt = `Analyze the following story and convert it into a comic script format. Break it down into ${config.pageCount} pages with ${config.panelCount} panels each. For each panel, provide:
1. Scene description (visual details for image generation)
2. Character dialogue (if any)
3. Panel composition and camera angle

Story to analyze:
${story}

Please format the output as a comic script with clear panel descriptions that can be used for image generation. Focus on visual storytelling and make sure each panel advances the narrative. Style should match: ${config.style}`;

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
    if (!this.apiKeys.gemini) {
      throw new Error('Gemini API key not set');
    }

    try {
      const genAI = new GoogleGenAI({ apiKey: this.apiKeys.gemini });
      
      // Create a chat for text generation
      const chat = genAI.chats.create({
        model: 'gemini-2.0-flash-preview',
        history: [],
      });

      const result = await chat.sendMessage({ message: prompt });
      return result.text;
    } catch (error) {
      console.error('Gemini text API failed:', error);
      throw new Error('Failed to generate script with Gemini');
    }
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
          dialogue: scene.dialogue,
          promptUsed: this.buildImagePrompt(scene.description, config)
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
      
      onProgress?.(i + 1, panels.length, `Generating page ${pageNumber}, panel ${panelNumber} using ${config.imageAI}...`);
      
      try {
        // Add character context to the prompt
        const enhancedPrompt = this.addCharacterContext(
          panel.sceneDescription,
          characters,
          config
        );
        
        const imageUrl = await this.generateImage(enhancedPrompt, config);
        
        generatedPanels.push({
          ...panel,
          imageUrl,
          promptUsed: enhancedPrompt
        });
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`Failed to generate panel ${i + 1}:`, error);
        generatedPanels.push({
          ...panel,
          error: `Failed to generate image using ${config.imageAI}`
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
    
    // Split script into paragraphs
    const paragraphs = script.split(/\n\s*\n/).filter(p => p.trim());
    
    for (const paragraph of paragraphs) {
      const lines = paragraph.split('\n').map(line => line.trim()).filter(line => line);
      
      if (lines.length === 0) continue;
      
      let description = '';
      let dialogue = '';
      
      for (const line of lines) {
        // Check if line looks like dialogue (has character name or quotes)
        if (line.includes(':') || line.startsWith('"') || line.includes('(') && line.includes(')')) {
          dialogue += line + ' ';
        } else {
          description += line + ' ';
        }
      }
      
      scenes.push({
        description: description.trim() || 'Comic panel scene',
        dialogue: dialogue.trim()
      });
    }
    
    return scenes;
  }

  private buildImagePrompt(basePrompt: string, config: ComicConfig): string {
    let prompt = basePrompt;
    
    // Add style modifiers
    const styleModifiers = {
      cyberpunk: 'cyberpunk style, neon lights, futuristic city, dark atmosphere',
      '3d': '3D rendered, volumetric lighting, detailed textures, realistic materials',
      photorealistic: 'ultra photorealistic, DSLR camera quality, professional studio lighting, sharp focus, highly detailed, 8K resolution',
      manga: 'manga style, anime art, black and white or limited color',
      western: 'western comic book style, bold colors, dynamic action',
      'golden-age': 'golden age comics style, vintage comic book art',
      modern: 'modern comic book style, detailed art, professional comic',
      anime: 'anime style, cel-shaded, Japanese animation',
      noir: 'film noir style, black and white, dramatic shadows',
      'pop-art': 'pop art style, bold colors, comic book dots',
      'pixel-art': '8-bit pixel art style, retro gaming aesthetic'
    };
    
    if (styleModifiers[config.style]) {
      prompt = `${prompt}, ${styleModifiers[config.style]}`;
    }
    
    // Add quality and format modifiers
    prompt += ', comic book panel, high quality, detailed art';
    
    if (config.promptBooster) {
      prompt += ', masterpiece, best quality, ultra detailed';
    }
    
    return prompt;
  }

  private addCharacterContext(prompt: string, characters: Character[], config: ComicConfig): string {
    if (characters.length === 0) return prompt;
    
    // Add character descriptions to the prompt
    const characterDescriptions = characters
      .map(char => `${char.name}: ${char.description}`)
      .join(', ');
    
    return `${prompt}, featuring characters: ${characterDescriptions}`;
  }

  // Generate character preview using Gemini 2.0 Flash Image Generation with image input
  async generateCharacterPreview(referenceImageData: string, description: string, style?: string): Promise<string> {
    if (!this.apiKeys.gemini) {
      throw new Error('Gemini API key is required for character preview generation');
    }

    try {
      const genAI = new GoogleGenAI({ apiKey: this.apiKeys.gemini });
      
      // Create a chat for image generation
      const chat = genAI.chats.create({
        model: 'gemini-2.0-flash-preview-image-generation',
        config: {
          responseModalities: [Modality.TEXT, Modality.IMAGE],
        },
        history: [],
      });

      // Extract base64 data from data URL
      const base64Data = referenceImageData.split(',')[1];
      const stylePrompt = style ? ` in ${style} comic book style` : ' in comic book style';
      
      const prompt = `Generate a character illustration based on this reference image and description. The generated image should be 90% or more matching with the original character${stylePrompt}. Character description: ${description}. Style: detailed comic book character art, consistent character design, high quality illustration, maintain exact character features and appearance.`;

      const result = await chat.sendMessageStream({
        message: [
          {
            text: prompt
          },
          {
            inlineData: {
              data: base64Data,
              mimeType: 'image/png'
            }
          }
        ]
      });

      // Extract image from response stream
      for await (const chunk of result) {
        for (const candidate of chunk.candidates) {
          for (const part of candidate.content.parts ?? []) {
            if (part.inlineData) {
              const data = part.inlineData;
              if (data && data.data) {
                // Return as data URL
                return `data:image/png;base64,${data.data}`;
              }
            }
          }
        }
      }

      throw new Error('No character preview generated by Gemini');
    } catch (error) {
      console.error('Character preview generation failed:', error);
      throw error;
    }
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