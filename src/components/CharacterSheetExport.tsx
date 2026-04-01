import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Printer, Download, User, Palette, Shirt, Star, Clock } from 'lucide-react';

interface CharacterAnalysis {
  suggestedName: string;
  physicalDescription: string;
  clothing: string;
  distinguishingFeatures: string;
  colorPalette: string;
  estimatedAge: string;
  confidence: 'high' | 'medium' | 'low';
}

interface CharacterData {
  image: string;
  characterName: string;
  analysis?: CharacterAnalysis;
}

interface CharacterSheetExportProps {
  isOpen: boolean;
  onClose: () => void;
  characters: CharacterData[];
  projectTitle?: string;
  artStyle?: string;
}

export function CharacterSheetExport({
  isOpen,
  onClose,
  characters,
  projectTitle = 'Untitled Project',
  artStyle = 'Comic',
}: CharacterSheetExportProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  if (characters.length === 0) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-primary" />
            Character Reference Sheet
          </DialogTitle>
          <DialogDescription>
            Print or save this reference sheet for your project's characters.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable preview area */}
        <div className="flex-1 overflow-y-auto border rounded-lg bg-white">
          <div ref={printRef} className="character-sheet-export p-8" id="character-sheet">
            {/* Header */}
            <div className="text-center mb-8 border-b-2 border-gray-900 pb-4">
              <h1 className="text-3xl font-bold text-gray-900 tracking-wide">
                CHARACTER REFERENCE SHEET
              </h1>
              <p className="text-lg text-gray-700 mt-2">{projectTitle}</p>
              <p className="text-sm text-gray-500 mt-1">Art Style: {artStyle}</p>
            </div>

            {/* Character grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {characters.map((char, index) => (
                <CharacterCard key={index} character={char} />
              ))}
            </div>

            {/* Footer */}
            <div className="mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
              <p>Generated on {new Date().toLocaleDateString()} • {characters.length} character{characters.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handlePrint} className="gap-2">
            <Download className="w-4 h-4" />
            Print / Save PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CharacterCard({ character }: { character: CharacterData }) {
  const { image, characterName, analysis } = character;

  return (
    <div className="character-card border-2 border-gray-900 rounded-lg overflow-hidden bg-white">
      {/* Character header with image */}
      <div className="flex gap-4 p-4 bg-gray-50">
        <img
          src={image}
          alt={characterName}
          className="w-24 h-24 object-cover rounded-lg border border-gray-300"
        />
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-900 tracking-wide">
            {characterName}
          </h2>
          {analysis && (
            <p className="text-sm text-gray-600 mt-1">
              {analysis.estimatedAge}
            </p>
          )}
        </div>
      </div>

      {/* Character details */}
      {analysis ? (
        <div className="p-4 space-y-3 text-sm">
          <DetailRow 
            icon={<User className="w-4 h-4 text-gray-600" />}
            label="Physical Description"
            value={analysis.physicalDescription}
          />
          <DetailRow 
            icon={<Shirt className="w-4 h-4 text-gray-600" />}
            label="Clothing/Costume"
            value={analysis.clothing}
          />
          <DetailRow 
            icon={<Star className="w-4 h-4 text-gray-600" />}
            label="Distinguishing Features"
            value={analysis.distinguishingFeatures}
          />
          <DetailRow 
            icon={<Palette className="w-4 h-4 text-gray-600" />}
            label="Color Palette"
            value={analysis.colorPalette}
          />
        </div>
      ) : (
        <div className="p-4 text-sm text-gray-500 italic">
          No AI analysis available. Run character detection to generate descriptions.
        </div>
      )}
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  if (!value) return null;
  
  return (
    <div className="flex gap-2">
      <div className="flex-shrink-0 mt-0.5">{icon}</div>
      <div>
        <span className="font-semibold text-gray-700">{label}:</span>{' '}
        <span className="text-gray-900">{value}</span>
      </div>
    </div>
  );
}
