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
    setIsExporting(true);
    
    try {
      let blob: Blob;
      let filename: string;
      
      switch (exportOptions.format) {
        case 'pdf':
          blob = await PDFExporter.exportToPDF(panels, config, exportOptions);
          filename = `comic-${Date.now()}.pdf`;
          break;
          
        case 'zip':
          blob = await exportAsZip(panels, exportOptions);
          filename = `comic-images-${Date.now()}.zip`;
          break;
          
        case 'cbz':
          blob = await exportAsCBZ(panels, exportOptions);
          filename = `comic-${Date.now()}.cbz`;
          break;
          
        case 'epub':
          blob = await exportAsEPub(panels, config, exportOptions);
          filename = `comic-${Date.now()}.epub`;
          break;
          
        default:
          throw new Error('Unsupported export format');
      }
      
      // Download the file
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
      toast.error("Export failed. Please try again.");
      console.error("Export error:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const exportAsZip = async (panels: ComicPanel[], options: ExportOptions): Promise<Blob> => {
    const { default: JSZip } = await import('jszip');
    const zip = new JSZip();
    
    for (let i = 0; i < panels.length; i++) {
      const panel = panels[i];
      if (panel.imageUrl) {
        try {
          const response = await fetch(panel.imageUrl);
          const blob = await response.blob();
          zip.file(`panel-${String(i + 1).padStart(3, '0')}.jpg`, blob);
          
          if (options.includeDialogue && panel.dialogue) {
            zip.file(`panel-${String(i + 1).padStart(3, '0')}-dialogue.txt`, panel.dialogue);
          }
        } catch (error) {
          console.error(`Failed to add panel ${i + 1} to zip:`, error);
        }
      }
    }
    
    return await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  };

  const exportAsCBZ = async (panels: ComicPanel[], options: ExportOptions): Promise<Blob> => {
    // CBZ is essentially a ZIP file with a different extension
    return await exportAsZip(panels, options);
  };

  const exportAsEPub = async (panels: ComicPanel[], config: ComicConfig, options: ExportOptions): Promise<Blob> => {
    const { default: JSZip } = await import('jszip');
    const zip = new JSZip();
    
    // Create basic ePub structure
    zip.file('mimetype', 'application/epub+zip');
    
    const metaInf = zip.folder('META-INF');
    metaInf?.file('container.xml', `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

    const oebps = zip.folder('OEBPS');
    
    // Create content.opf
    let manifestItems = '';
    let spineItems = '';
    
    for (let i = 0; i < panels.length; i++) {
      manifestItems += `    <item id="page${i + 1}" href="page${i + 1}.xhtml" media-type="application/xhtml+xml"/>\n`;
      manifestItems += `    <item id="image${i + 1}" href="images/panel${i + 1}.jpg" media-type="image/jpeg"/>\n`;
      spineItems += `    <itemref idref="page${i + 1}"/>\n`;
    }
    
    oebps?.file('content.opf', `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="uid" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>AI Generated Comic</dc:title>
    <dc:creator>AI Comic Creator</dc:creator>
    <dc:identifier id="uid">comic-${Date.now()}</dc:identifier>
    <dc:language>en</dc:language>
  </metadata>
  <manifest>
${manifestItems}  </manifest>
  <spine>
${spineItems}  </spine>
</package>`);

    const images = oebps?.folder('images');
    
    // Add images and pages
    for (let i = 0; i < panels.length; i++) {
      const panel = panels[i];
      
      if (panel.imageUrl) {
        try {
          const response = await fetch(panel.imageUrl);
          const blob = await response.blob();
          images?.file(`panel${i + 1}.jpg`, blob);
        } catch (error) {
          console.error(`Failed to add panel ${i + 1} to ePub:`, error);
        }
      }
      
      // Create XHTML page
      const pageContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>Page ${i + 1}</title>
  <style>
    body { margin: 0; padding: 0; text-align: center; }
    img { max-width: 100%; height: auto; }
    .dialogue { margin: 10px; padding: 10px; background: #f0f0f0; border-radius: 5px; }
  </style>
</head>
<body>
  <img src="images/panel${i + 1}.jpg" alt="Comic panel ${i + 1}" />
  ${options.includeDialogue && panel.dialogue ? `<div class="dialogue">${panel.dialogue}</div>` : ''}
</body>
</html>`;
      
      oebps?.file(`page${i + 1}.xhtml`, pageContent);
    }
    
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
    const baseSize = panels.length * 2; // MB per panel
    const qualityMultiplier = exportOptions.quality === "high" ? 1.5 : exportOptions.quality === "medium" ? 1 : 0.6;
    return Math.round(baseSize * qualityMultiplier);
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
            <Badge variant="outline">{getEstimatedSize()} MB</Badge>
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