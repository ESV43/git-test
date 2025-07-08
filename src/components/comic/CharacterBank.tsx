import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Plus, Trash2, Upload, Wand2, Eye, AlertTriangle, X } from "lucide-react";
import { Character } from "@/types/comic";
import { comicAPI } from "@/services/api";
import { toast } from "sonner";

interface CharacterBankProps {
  characters: Character[];
  onCharactersChange: (characters: Character[]) => void;
}

export const CharacterBank = ({ characters, onCharactersChange }: CharacterBankProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newCharacter, setNewCharacter] = useState<Partial<Character>>({
    name: "",
    description: "",
    persona: "",
    images: []
  });
  const [generatingPreview, setGeneratingPreview] = useState(false);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [previewModel, setPreviewModel] = useState<'gemini' | 'flux'>('gemini');

  const addCharacter = () => {
    if (!newCharacter.name?.trim()) return;
    
    const character: Character = {
      id: `char-${Date.now()}`,
      name: newCharacter.name,
      description: newCharacter.description || "",
      persona: newCharacter.persona || "",
      images: newCharacter.images || [],
      previewImages: previewImages,
      voiceTone: "",
      catchphrases: []
    };
    
    onCharactersChange([...characters, character]);
    setNewCharacter({ name: "", description: "", persona: "", images: [] });
    setPreviewImages([]);
    setIsAdding(false);
  };

  const removeCharacter = (id: string) => {
    onCharactersChange(characters.filter(char => char.id !== id));
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files) return;
    
    const fileArray = Array.from(files);
    if (fileArray.length > 5) {
      toast.error("Maximum 5 images allowed");
      return;
    }
    
    // Convert to data URLs for display and storage
    const imageUrls: string[] = [];
    for (const file of fileArray) {
      const dataUrl = await fileToDataUrl(file);
      imageUrls.push(dataUrl);
    }
    
    setNewCharacter(prev => ({
      ...prev,
      images: [...(prev.images || []), ...imageUrls]
    }));
  };

  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    });
  };

  const generateCharacterPreview = async () => {
    if (!newCharacter.images?.length || !newCharacter.description) {
      toast.error("Please upload an image and add a description first");
      return;
    }

    if (previewModel === 'gemini' && !comicAPI.hasRequiredAPIKey('gemini')) {
      toast.error("Gemini API key is required for Gemini preview generation");
      return;
    }

    setGeneratingPreview(true);
    try {
      const referenceImage = newCharacter.images[0];
      let preview: string;
      
      if (previewModel === 'gemini') {
        preview = await comicAPI.generateCharacterPreview(referenceImage, newCharacter.description);
      } else {
        // Use Pollinations Flux as alternative
        const prompt = `Character portrait based on this description: ${newCharacter.description}. Comic book style, detailed character art, consistent design.`;
        preview = await comicAPI.generateImageWithPollinations(prompt, { 
          imageAI: 'flux', 
          style: 'modern',
          aspectRatio: '1:1'
        } as any);
      }
      
      setPreviewImages([...previewImages, preview]);
      toast.success(`Character preview generated using ${previewModel}! This shows how your character will appear in comics.`);
    } catch (error) {
      console.error("Preview generation failed:", error);
      toast.error(`Failed to generate character preview with ${previewModel}`);
    } finally {
      setGeneratingPreview(false);
    }
  };

  const removePreview = (index: number) => {
    setPreviewImages(previewImages.filter((_, i) => i !== index));
  };

  return (
    <Card className="bg-cyber-card border-secondary">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-secondary flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Character Bank
          </CardTitle>
          <Button
            size="sm"
            onClick={() => setIsAdding(!isAdding)}
            className="bg-secondary hover:bg-secondary/80"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Character Form */}
        {isAdding && (
          <div className="p-4 bg-muted/30 rounded-lg border border-secondary/30 space-y-3">
            <Input
              placeholder="Character name"
              value={newCharacter.name || ""}
              onChange={(e) => setNewCharacter(prev => ({ ...prev, name: e.target.value }))}
              className="bg-muted/50"
            />
            
            <Textarea
              placeholder="Character description (appearance, clothing, etc.)"
              value={newCharacter.description || ""}
              onChange={(e) => setNewCharacter(prev => ({ ...prev, description: e.target.value }))}
              className="bg-muted/50 min-h-[80px]"
            />
            
            <Textarea
              placeholder="Personality & voice tone"
              value={newCharacter.persona || ""}
              onChange={(e) => setNewCharacter(prev => ({ ...prev, persona: e.target.value }))}
              className="bg-muted/50 min-h-[60px]"
            />
            
            <div>
              <label className="block text-sm font-medium mb-2">Reference Images</label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handleImageUpload(e.target.files)}
                className="hidden"
                id="character-images"
              />
              <label
                htmlFor="character-images"
                className="flex items-center justify-center p-4 border-2 border-dashed border-secondary/50 rounded-lg cursor-pointer hover:border-secondary transition-colors"
              >
                <Upload className="w-5 h-5 mr-2" />
                Upload Images (1-5)
              </label>
              
              {newCharacter.images && newCharacter.images.length > 0 && (
                <div className="space-y-3">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Reference Images:</span>
                      <div className="flex items-center space-x-2">
                        <Select value={previewModel} onValueChange={(value: 'gemini' | 'flux') => setPreviewModel(value)}>
                          <SelectTrigger className="w-24 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="gemini">Gemini</SelectItem>
                            <SelectItem value="flux">Flux</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={generateCharacterPreview}
                          disabled={generatingPreview || !newCharacter.description || (previewModel === 'gemini' && !comicAPI.hasRequiredAPIKey('gemini'))}
                          className="border-primary text-primary hover:bg-primary/10"
                        >
                          <Wand2 className="w-3 h-3 mr-1" />
                          {generatingPreview ? "Generating..." : "Generate Preview"}
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {newCharacter.images.map((img, idx) => (
                      <img key={idx} src={img} alt="Character reference" className="w-16 h-16 object-cover rounded border border-primary/30" />
                    ))}
                  </div>

                  {previewModel === 'gemini' && !comicAPI.hasRequiredAPIKey('gemini') && (
                    <div className="flex items-center space-x-2 p-2 bg-destructive/10 border border-destructive/50 rounded text-xs">
                      <AlertTriangle className="w-3 h-3 text-destructive" />
                      <span className="text-destructive">Gemini API key required for Gemini preview generation</span>
                    </div>
                  )}

                  {previewImages.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Eye className="w-4 h-4 text-accent" />
                        <span className="text-sm font-medium text-accent">AI Generated Previews:</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {previewImages.map((preview, idx) => (
                          <div key={idx} className="relative group">
                            <img src={preview} alt="AI Preview" className="w-16 h-16 object-cover rounded border-2 border-accent glow-effect" />
                            <Badge className="absolute -top-1 -right-1 text-xs bg-accent">AI</Badge>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => removePreview(idx)}
                              className="absolute -top-1 -left-1 w-4 h-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-2 h-2" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-accent">✨ This shows how your character will appear in comic panels</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex space-x-2">
              <Button onClick={addCharacter} size="sm" className="bg-secondary">
                Save Character
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAdding(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Character List */}
        {characters.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No characters yet.</p>
            <p className="text-sm">Add characters to ensure consistent appearance across panels.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {characters.map((character) => (
              <div key={character.id} className="flex items-start space-x-3 p-3 bg-muted/20 rounded-lg">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={character.images[0]} />
                  <AvatarFallback className="bg-secondary text-secondary-foreground">
                    {character.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">{character.name}</h4>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeCharacter(character.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {character.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {character.description}
                    </p>
                  )}
                  
                  <div className="flex items-center space-x-2 mt-2">
                    <Badge variant="secondary" className="text-xs">
                      {character.images.length} images
                    </Badge>
                    {character.persona && (
                      <Badge variant="outline" className="text-xs">
                        Persona defined
                      </Badge>
                    )}
                    {character.previewImages && character.previewImages.length > 0 && (
                      <Badge variant="outline" className="text-xs bg-accent/10 text-accent border-accent">
                        {character.previewImages.length} AI previews
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};