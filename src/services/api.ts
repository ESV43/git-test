import { ComicConfig, Character, ComicPanel, APIKeys } from "@/types/comic";
import { GoogleGenAI, Modality } from '@google/genai';

// API service for comic generation
export class ComicGeneratorAPI {
  private apiKeys: APIKeys = {};
  private geminiKeyIndex = 0;

  setAPIKeys(keys: APIKeys) {
    this.apiKeys = { ...this.apiKeys, ...keys };
    this.geminiKeyIndex = 0; // Reset index when keys are updated
    localStorage.setItem('comic-api-keys', JSON.stringify(keys));
  }

  getAPIKeys(): APIKeys {
    return this.apiKeys;
  }

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

  hasRequiredAPIKey(model: string): boolean {
    if (model.startsWith('gemini')) {
      return !!this.apiKeys.gemini && this.apiKeys.gemini.length > 0;
    }
    if (model === 'huggingface') {
      return !!this.apiKeys.huggingface && this.apiKeys.huggingface.length > 0;
    }
    return true;
  }

  private async _callGeminiWithRetry<T>(
    apiCall: (apiKey: string) => Promise<T>,
    maxRetriesPerKey: number = 2
  ): Promise<T> {
    const keys = this.apiKeys.gemini;
    if (!keys || keys.length === 0) {
      throw new Error("No Gemini API keys configured. Please add at least one key.");
    }

    let lastError: Error | null = null;
    const totalAttempts = keys.length * maxRetriesPerKey;

    for (let attempt = 0; attempt < totalAttempts; attempt++) {
      const keyIndex = this.geminiKeyIndex;
      const apiKey = this.getNextGeminiKey();
      if (!apiKey) continue;

      try {
        console.log(`Attempt #${attempt + 1}/${totalAttempts} with key index ${keyIndex}`);
        const result = await apiCall(apiKey);
        return result;
      } catch (error: any) {
        lastError = error;
        console.error(`Attempt #${attempt + 1} with key index ${keyIndex} failed:`, error.message);

        if (error.message && (error.message.includes('429') || error.message.toLowerCase().includes('rate limit'))) {
          const delay = Math.pow(2, Math.floor(attempt / keys.length)) * 1000 + Math.random() * 1000;
          console.log(`Rate limit detected. Waiting for ${Math.round(delay / 1000)}s before next attempt...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    throw lastError || new Error(`All ${totalAttempts} retry attempts failed.`);
  }

  async generateImage(prompt: string, config: ComicConfig, characters?: Character[]): Promise<string> {
    const enhancedPrompt = this.buildImagePrompt(prompt, config, characters);
    const currentModel = config.imageAI;
    
    try {
      if (currentModel.startsWith('gemini')) {
        return await this.generateImageWithGemini(enhancedPrompt, characters);
      } else if (currentModel === 'huggingface') {
        if (!this.apiKeys.huggingface) throw new Error('HuggingFace API key is required.');
        return await this.generateImageWithHuggingFace(enhancedPrompt);
      } else {
        return await this.generateImageWithPollinations(enhancedPrompt, config);
      }
    } catch (error) {
      console.error(`Image generation for model ${currentModel} failed permanently:`, error);
      throw error;
    }
  }

  async generateImageWithPollinations(prompt: string, config: ComicConfig): Promise<string> {
    const modelMap = { 'flux': 'flux', 'kontext': 'kontext', 'turbo': 'turbo', 'gptimage': 'gptimage', 'pollinations': 'flux' };
    const model = modelMap[config.imageAI as keyof typeof modelMap] || 'flux';
    const params = new URLSearchParams({
      width: this.getImageDimensions(config.aspectRatio).width.toString(),
      height: this.getImageDimensions(config.aspectRatio).height.toString(),
      model: model,
      ...(config.seed && { seed: config.seed.toString() })
    });
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params.toString()}`;
  }

  private async generateImageWithGemini(prompt: string, characters?: Character[]): Promise<string> {
    return this._callGeminiWithRetry(async (apiKey) => {
        const genAI = new GoogleGenAI({ apiKey });
        // Use the Pro model which is excellent for multimodal generation
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
        
        const messageParts: (string | { inlineData: { data: string, mimeType: string }})[] = [{ text: prompt }];
        if (characters) {
            for (const char of characters) {
                if (prompt.toLowerCase().includes(char.name.toLowerCase())) {
                    const refImages = char.previewImages?.length ? char.previewImages : char.images;
                    for (const imgDataUrl of refImages) {
                        const base64Data = imgDataUrl.split(',')[1];
                        // Ensure mimeType is correctly inferred or set
                        const mimeType = imgDataUrl.match(/data:(image\/\w+);/)?.[1] || 'image/jpeg';
                        messageParts.push({ inlineData: { data: base64Data, mimeType } });
                    }
                }
            }
        }
        
        const result = await model.generateContent(messageParts);
        const response = result.response;
        
        // The Pro model returns the image directly in the response parts
        const imagePart = response.parts?.find(part => part.inlineData?.data);
        if (imagePart && imagePart.inlineData) {
            return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
        }

        throw new Error('No image generated by Gemini in response.');
    });
  }

  async analyzeStoryToScript(story: string, config: ComicConfig): Promise<string> {
    if (!this.hasRequiredAPIKey(config.textAI)) {
      throw new Error(`API key required for ${config.textAI}.`);
    }
    const prompt = `You are a professional screenwriter. Your task is to adapt the following story into a classic screenplay format.

**Instructions:**
1.  Start with "FADE IN:".
2.  Use standard screenplay elements:
    - **Scene Headings:** In all caps (e.g., EXT. CYBERPUNK ALLEY - NIGHT). Use INT. for interior scenes and EXT. for exterior scenes.
    - **Action Lines:** Describe the setting, character actions, and important visual details.
    - **Character Cues:** In all caps, followed by the dialogue on the next line (e.g., DETECTIVE NOVA).
    - **Dialogue:** The words the characters speak.
    - **Parentheticals:** For tone or non-verbal actions on their own line (e.g., (voice over), (CONT'D), (sarcastically)).
3.  Ensure the script flows logically and captures the essence of the story.
4.  The visual style should be "${config.style}". Infuse this style into your action line descriptions.
5.  End with "FADE OUT.".

**Story to Adapt:**
---
${story}
---

Produce the complete screenplay following these instructions precisely.`;

    if (config.textAI.startsWith('gemini')) {
      return this.callGeminiTextAPI(prompt, config.textAI);
    }
    return "This feature works best with a Gemini text model.";
  }

  private async callGeminiTextAPI(prompt: string, modelName: string): Promise<string> {
    return this._callGeminiWithRetry(async (apiKey) => {
      const genAI = new GoogleGenAI({ apiKey });
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      return result.response.text();
    });
  }

  private parseScreenplayToPanels(script: string): Array<{ description: string; dialogue: string }> {
    const panels: Array<{ description: string; dialogue: string }> = [];
    const blocks = script.split(/\n\s*\n/).filter(block => block.trim().length > 0);

    for (const block of blocks) {
        const lines = block.split('\n').map(l => l.trim());
        const firstLine = lines[0];

        if (firstLine.startsWith('FADE')) continue;

        if (firstLine.startsWith('INT.') || firstLine.startsWith('EXT.')) {
            panels.push({ description: `Establishing shot: ${block}`, dialogue: '' });
            continue;
        }

        const isDialogueCue = (str: string) => /^[A-Z][A-Z\s()']+$/.test(str) && !str.startsWith('INT.') && !str.startsWith('EXT.');

        if (isDialogueCue(firstLine)) {
            const character = firstLine.replace(/\(.*\)/, '').trim();
            const dialogueText = lines.slice(1).join(' ').trim();
            const lastDescription = panels.length > 0 ? panels[panels.length - 1].description : `A shot of ${character} speaking.`;
            panels.push({ description: lastDescription, dialogue: `${character}: ${dialogueText}` });
            continue;
        }

        panels.push({ description: block, dialogue: '' });
    }
    
    const mergedPanels: Array<{ description: string; dialogue: string }> = [];
    if (panels.length > 0) {
        let currentDescription = panels[0].description;
        let currentDialogue = panels[0].dialogue;

        for (let i = 1; i < panels.length; i++) {
            const nextPanel = panels[i];
            if (!nextPanel.dialogue && !currentDialogue) {
                currentDescription += `\n${nextPanel.description}`;
            } else {
                mergedPanels.push({ description: currentDescription, dialogue: currentDialogue });
                currentDescription = nextPanel.description;
                currentDialogue = nextPanel.dialogue;
            }
        }
        mergedPanels.push({ description: currentDescription, dialogue: currentDialogue });
    }

    return mergedPanels.length > 0 ? mergedPanels : [{ description: script, dialogue: '' }];
  }

  async processScript(script: string, config: ComicConfig): Promise<ComicPanel[]> {
    const panelData = this.parseScreenplayToPanels(script);
    
    if(panelData.length === 0) {
        return [];
    }
      
    const totalPanelsToGenerate = config.pageCount * config.panelCount;
    const panels: ComicPanel[] = [];
    
    for (let i = 0; i < totalPanelsToGenerate; i++) {
        const scene = panelData[i % panelData.length]; // Loop through scenes if not enough
        panels.push({
            id: `page-${Math.floor(i / config.panelCount) + 1}-panel-${(i % config.panelCount) + 1}`,
            sceneDescription: scene.description,
            dialogue: scene.dialogue,
        });
    }

    return panels;
  }

  async generateComicPanels(
    panels: ComicPanel[], config: ComicConfig, characters: Character[],
    onProgress?: (current: number, total: number, status: string) => void
  ): Promise<ComicPanel[]> {
    const generatedPanels: ComicPanel[] = [];
    for (let i = 0; i < panels.length; i++) {
      const panel = panels[i];
      onProgress?.(i, panels.length, `Generating panel ${i + 1}/${panels.length}...`);
      try {
        const imageUrl = await this.generateImage(panel.sceneDescription, config, characters);
        generatedPanels.push({ ...panel, imageUrl, promptUsed: this.buildImagePrompt(panel.sceneDescription, config, characters) });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        console.error(`Failed to generate panel ${i + 1} after all retries:`, error);
        generatedPanels.push({ ...panel, error: `Generation Failed: ${errorMessage}` });
      }
      onProgress?.(i + 1, panels.length, `Panel ${i + 1}/${panels.length} complete.`);
    }
    onProgress?.(panels.length, panels.length, 'All panels processed!');
    return generatedPanels;
  }

  async generateImageWithHuggingFace(prompt: string): Promise<string> {
    if (!this.apiKeys.huggingface) throw new Error('HuggingFace API key not set');
    const response = await fetch('https://api-inference.huggingface.co/models/runwayml/stable-diffusion-v1-5', {
      method: 'POST', headers: { 'Authorization': `Bearer ${this.apiKeys.huggingface}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: prompt, parameters: { num_inference_steps: 30, guidance_scale: 7.5 } }),
    });
    if (!response.ok) throw new Error('HuggingFace API request failed');
    return URL.createObjectURL(await response.blob());
  }

  buildImagePrompt(basePrompt: string, config: ComicConfig, characters?: Character[]): string {
    const styleModifiers = {
      cyberpunk: { p: 'cyberpunk, neon, futuristic, gritty, Blade Runner aesthetic', n: 'bright, clean' },
      '3d': { p: '3D render, CGI, octane render, unreal engine', n: '2D, drawing' },
      photorealistic: { p: 'photograph, 8k, DSLR, sharp focus, cinematic', n: 'drawing, painting, cartoon' },
      manga: { p: 'manga, black and white, screentones, sharp ink lines', n: 'color, photorealistic' },
      western: { p: 'western comic book art, bold colors, action lines, dynamic', n: 'manga, realistic' },
      'golden-age': { p: 'golden age comics, vintage, 1940s, pulpy', n: 'modern, digital' },
      modern: { p: 'modern comic book, detailed pencils, digital color, cinematic', n: 'vintage, sketch' },
      anime: { p: 'anime film screenshot, cel-shaded, vibrant, detailed background', n: 'realistic, 3d' },
      noir: { p: 'film noir, black and white, high contrast, dramatic shadows', n: 'color, bright' },
      'pop-art': { p: 'pop art, ben-day dots, bold colors, graphic', n: 'realistic, subtle' },
      'pixel-art': { p: '16-bit pixel art, retro gaming aesthetic, pixelated', n: 'smooth, vector' }
    };
    const style = styleModifiers[config.style as keyof typeof styleModifiers];
    let prompt = `(${style.p}:1.4), ${basePrompt}, comic book panel, detailed art`;
    if (config.promptBooster) prompt += ', masterpiece, best quality, ultra detailed';
    if (style.n) prompt += ` --no ${style.n}`;
    return prompt;
  }

  async generateCharacterPreview(refImg: string, desc: string, style?: string): Promise<string> {
    return this._callGeminiWithRetry(async (apiKey) => {
        const genAI = new GoogleGenAI({ apiKey });
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
        const prompt = `Re-draw this character based on the image and description, in a ${style || 'cyberpunk'} comic style. Maintain key features. Description: ${desc}.`;
        const imagePart = { inlineData: { data: refImg.split(',')[1], mimeType: 'image/png' }};
        const result = await model.generateContent([prompt, imagePart]);
        const response = result.response;
        const imageResponsePart = response.parts?.find(part => part.inlineData?.data);
        if (imageResponsePart && imageResponsePart.inlineData) {
            return `data:${imageResponsePart.inlineData.mimeType};base64,${imageResponsePart.inlineData.data}`;
        }
        throw new Error('No character preview generated.');
    });
  }

  private getImageDimensions(aspectRatio: string) {
    const r: { [key: string]: { width: number, height: number } } = {
      '1:1': { width: 1024, height: 1024 }, '4:3': { width: 1024, height: 768 },
      '3:4': { width: 768, height: 1024 }, '16:9': { width: 1280, height: 720 }
    };
    return r[aspectRatio] || r['4:3'];
  }
}

export const comicAPI = new ComicGeneratorAPI();
