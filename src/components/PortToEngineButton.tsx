import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Wand2, FileText } from 'lucide-react';
import { getStoryPlanMapping } from '@/lib/storyPlanData';
import { toast } from 'sonner';
import { PortFormatDialog } from '@/components/PortFormatDialog';

interface PortToEngineButtonProps {
  storyId: string;
}

export const PortToEngineButton = ({ storyId }: PortToEngineButtonProps) => {
  const navigate = useNavigate();
  const mapping = getStoryPlanMapping(storyId);
  const [formatOpen, setFormatOpen] = useState(false);

  if (!mapping) return null;

  const handleFormatConfirm = (formatFields: Record<string, string>) => {
    const mergedData = { ...mapping.engineData, ...formatFields };
    localStorage.setItem('narrative-engine-import', JSON.stringify(mergedData));
    toast.success(`Porting "${mapping.title}" into Narrative Engine…`);
    setFormatOpen(false);
    navigate('/narrative-engine');
  };

  const handlePortToFormatter = () => {
    localStorage.setItem('script-formatter-import', JSON.stringify({
      title: mapping.title,
      content: mapping.scriptText,
    }));
    toast.success(`Porting "${mapping.title}" into Script Formatter…`);
    navigate('/script-formatter');
  };

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => setFormatOpen(true)} variant="hero" size="default" className="gap-2">
          <Wand2 className="h-4 w-4" />
          Port into Narrative Engine
        </Button>
        <Button onClick={handlePortToFormatter} variant="outline" size="default" className="gap-2">
          <FileText className="h-4 w-4" />
          Port to Script Formatter
        </Button>
      </div>
      <PortFormatDialog
        open={formatOpen}
        onOpenChange={setFormatOpen}
        onConfirm={handleFormatConfirm}
        storyTitle={mapping.title}
        defaultFormat={mapping.defaultFormat}
      />
    </>
  );
};
