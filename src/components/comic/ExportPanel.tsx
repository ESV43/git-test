import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Download, FileImage, Archive, Book, Globe } from "lucide-react";
import { ComicPanel, ComicConfig, ExportOptions } from "@/types/comic";
import { PDFExporter } from "./PDFExporter";
import { toast } from "sonner";

interface ExportPanelProps {
  panels: ComicPanel[];
  config: ComicConfig;
}

type PanelWithImageData = {
  dataUrl: string | null;
  panel: ComicPanel;
};

// Helper function to pre-fetch all images and convert them to data URLs
const getPanelImageData = async (panels: ComicPanel[]): Promise<PanelWithImageData[]> => {
  const imagePromises = panels.map(async (panel, index) => {
    if (!panel.imageUrl) {
      return { dataUrl: null, panel };
    }

    // If it's already a data URL, just return it.
    if (panel.imageUrl.startsWith('data:')) {
      return { dataUrl: panel.imageUrl, panel };
    }

    // Fetch external URLs
    try {
      const response = await fetch(panel.imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      const blob = await response.blob();
      
      // Convert blob to data URL
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve({ dataUrl: reader.result as string, panel });
        };
        reader.onerror = () => {
          console.error(`FileReader error for panel ${index + 1}`);
          resolve({ dataUrl: null, panel }); // Resolve with null on error
        };
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error(`Error fetching image for panel ${index + 1}:`, error);
      return { dataUrl: null, panel };
    }
  });

  // Use Promise.all to ensure all fetches complete and maintain original order
  return Promise.all(imagePromises);
};


export const ExportPanel = ({ panels, config }: ExportPanelProps) => {
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: "pdf",
    quality: "high",
    includeDialogue: true,
    watermark: false
  });
  const [isExporting, setIsExporting] = useState(false);

  const updateOptions = (updates: Partial<ExportOptions>) => {
    setExportOptions(prev => ({ ...prev, ...updates }));
  };

  const handleExport = async () => {
    if (isExporting || panels.length === 0) return;

    setIsExporting(true);
    toast.info("Preparing export... This may take a moment for large comics.", { duration: 10000 });

    try {
      // Step 1: Pre-fetch all image data to ensure order and handle failures
      const imageData = await getPanelImageData(panels);
      const successfulPanels = imageData.filter(d => d.dataUrl);

      if (successfulPanels.length === 0) {
        throw new Error("No images could be downloaded for the export.");
      }
      if (successfulPanels.length < panels.length) {
        toast.warning(`${panels.length - successfulPanels.length} images failed to download and will be missing from the export.`);
      }

      toast.success("Images prepared. Creating export file...");

      let blob: Blob;
      let filename: string;
      
      switch (exportOptions.format) {
        case 'pdf':
          blob = await PDFExporter.exportToPDF(imageData, config, exportOptions);
          filename = `comic-${Date.now()}.pdf`;
          break;
        case 'zip':
        case 'cbz':
          blob = await exportAsZip(imageData, exportOptions);
          filename = `comic-${Date.now()}.${exportOptions.format}`;
          break;
        case 'epub':
          blob = await exportAsEPub(imageData, config, exportOptions);
          filename = `comic-${Date.now()}.epub`;
          break;
        default:
          throw new Error('Unsupported export format');
      }
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(`Comic exported as ${exportOptions.format.toUpperCase()}!`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast.error(`Export failed: ${errorMessage}`);
      console.error("Export error:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const exportAsZip = async (imageData: PanelWithImageData[], options: ExportOptions): Promise<Blob> => {
    const { default: JSZip } = await import('jszip');
    const zip = new JSZip();
    
    imageData.forEach(({ dataUrl, panel }, index) => {
      if (dataUrl) {
        const base64Data = dataUrl.split(',')[1];
        zip.file(`panel-${String(index + 1).padStart(3, '0')}.jpg`, base64Data, { base64: true });
      }
      
      if (options.includeDialogue && panel.dialogue) {
        zip.file(`panel-${String(index + 1).padStart(3, '0')}-dialogue.txt`, panel.dialogue);
      }
    });
    
    return await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  };
  
  const exportAsEPub = async (imageData: PanelWithImageData[], config: ComicConfig, options: ExportOptions): Promise<Blob> => {
    const { default: JSZip } = await import('jszip');
    const zip = new JSZip();
    
    zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
    
    const metaInf = zip.folder('META-INF');
    metaInf?.file('container.xml', `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

    const oebps = zip.folder('OEBPS');
    const imagesFolder = oebps?.folder('images');
    
    let manifestItems = '';
    let spineItems = '';
    
    for (let i = 0; i < imageData.length; i++) {
        const { dataUrl, panel } = imageData[i];
        const pageNum = i + 1;
        const imageFilename = `panel${pageNum}.jpg`;

        if (dataUrl) {
            manifestItems += `    <item id="image${pageNum}" href="images/${imageFilename}" media-type="image/jpeg"/>\n`;
            const base64Data = dataUrl.split(',')[1];
            imagesFolder?.file(imageFilename, base64Data, { base64: true });
        }

        manifestItems += `    <item id="page${pageNum}" href="page${pageNum}.xhtml" media-type="application/xhtml+xml"/>\n`;
        spineItems += `    <itemref idref="page${pageNum}"/>\n`;

        const pageContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>Page ${pageNum}</title>
  <style>
    body { margin: 0; padding: 0; text-align: center; background-color: #000; }
    img { max-width: 100vw; max-height: 100vh; object-fit: contain; }
    .dialogue { margin: 1em; padding: 0.5em; background: rgba(255,255,255,0.8); border-radius: 5px; color: #000; }
  </style>
</head>
<body>
  ${dataUrl ? `<img src="images/${imageFilename}" alt="Comic panel ${pageNum}" />` : ''}
  ${options.includeDialogue && panel.dialogue ? `<div class="dialogue">${panel.dialogue}</div>` : ''}
</body>
</html>`;
        
        oebps?.file(`page${pageNum}.xhtml`, pageContent);
    }

    oebps?.file('content.opf', `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="uid" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>AI Generated Comic</dc:title>
    <dc:creator>ComicAI</dc:creator>
    <dc:identifier id="uid">urn:uuid:${Date.now()}</dc:identifier>
    <dc:language>en</dc:language>
    <meta property="rendition:layout">pre-paginated</meta>
    <meta property="rendition:orientation">auto</meta>
    <meta property="rendition:spread">auto</meta>
  </metadata>
  <manifest>
${manifestItems}  </manifest>
  <spine>
${spineItems}  </spine>
</package>`);
    
    return await zip.generateAsync({ type: 'blob' });
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case "pdf": return <Book className="w-4 h-4" />;
      case "zip": return <Archive className="w-4 h-4" />;
      case "cbz": return <Archive className="w-4 h-4" />;
      case "epub": return <Globe className="w-4 h-4" />;
      default: return <FileImage className="w-4 h-4" />;
    }
  };

  const getEstimatedSize = () => {
    const baseSize = panels.length * 0.5; // MB per panel (more realistic average)
    const qualityMultiplier = exportOptions.quality === "high" ? 1.5 : exportOptions.quality === "medium" ? 1 : 0.6;
    const size = baseSize * qualityMultiplier;
    return size < 1 ? "< 1" : Math.round(size);
  };

  return (
    <Card className="bg-cyber-card border-neon-orange">
      <CardHeader>
        <CardTitle className="text-neon-orange flex items-center">
          <Download className="w-5 h-5 mr-2" />
          Export Comic
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Export Format */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Export Format</Label>
          <Select value={exportOptions.format} onValueChange={(value: any) => updateOptions({ format: value })}>
            <SelectTrigger className="bg-muted/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pdf">
                <div className="flex items-center">
                  <Book className="w-4 h-4 mr-2" />
                  PDF Document
                </div>
              </SelectItem>
              <SelectItem value="zip">
                <div className="flex items-center">
                  <Archive className="w-4 h-4 mr-2" />
                  ZIP Archive
                </div>
              </SelectItem>
              <SelectItem value="cbz">
                <div className="flex items-center">
                  <Archive className="w-4 h-4 mr-2" />
                  Comic Book Archive (.cbz)
                </div>
              </SelectItem>
              <SelectItem value="epub">
                <div className="flex items-center">
                  <Globe className="w-4 h-4 mr-2" />
                  ePub (Web Comic)
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Quality Settings */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Image Quality</Label>
          <Select value={exportOptions.quality} onValueChange={(value: any) => updateOptions({ quality: value })}>
            <SelectTrigger className="bg-muted/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low (Faster, smaller file)</SelectItem>
              <SelectItem value="medium">Medium (Balanced)</SelectItem>
              <SelectItem value="high">High (Best quality)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Export Options */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Include Dialogue</Label>
            <Switch
              checked={exportOptions.includeDialogue}
              onCheckedChange={(checked) => updateOptions({ includeDialogue: checked })}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Add Watermark</Label>
            <Switch
              checked={exportOptions.watermark}
              onCheckedChange={(checked) => updateOptions({ watermark: checked })}
            />
          </div>
        </div>

        {/* Export Info */}
        <div className="p-4 bg-muted/30 rounded-lg space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Panels:</span>
            <Badge variant="secondary">{panels.length}</Badge>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Estimated size:</span>
            <Badge variant="outline">~{getEstimatedSize()} MB</Badge>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Format:</span>
            <div className="flex items-center">
              {getFormatIcon(exportOptions.format)}
              <span className="ml-1">{exportOptions.format.toUpperCase()}</span>
            </div>
          </div>
        </div>

        {/* Export Button */}
        <Button
          onClick={handleExport}
          disabled={isExporting || panels.length === 0}
          className="w-full bg-gradient-cyber hover:shadow-cyber"
          size="lg"
        >
          {isExporting ? (
            <>
              <div className="w-4 h-4 mr-2 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Export Comic
            </>
          )}
        </Button>

        {/* Format Descriptions */}
        <div className="text-xs text-muted-foreground space-y-1">
          {exportOptions.format === "pdf" && (
            <p>• PDF: Perfect for printing and sharing. Maintains high quality and includes dialogue as text layers.</p>
          )}
          {exportOptions.format === "zip" && (
            <p>• ZIP: Individual image files. Great for web use or custom layouts.</p>
          )}
          {exportOptions.format === "cbz" && (
            <p>• CBZ: Standard comic book format. Compatible with most comic readers.</p>
          )}
          {exportOptions.format === "epub" && (
            <p>• ePub: Web-friendly format with responsive design for mobile reading.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
