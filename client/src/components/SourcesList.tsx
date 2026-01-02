import {
  Sources,
  SourcesTrigger,
  SourcesContent,
  Source,
} from "@/components/ai-elements/sources";

interface SourceItem {
  id: string;
  title: string;
  category: string;
  content: string;
}

interface SourcesListProps {
  sources: SourceItem[];
}

export const SourcesList = ({ sources }: SourcesListProps) => {
  if (!sources || sources.length === 0) return null;

  return (
    <Sources>
      <SourcesTrigger count={sources.length} />
      <SourcesContent>
        {sources.map((source) => (
          <Source
            key={source.id}
            href={`#source-${source.id}`}
            title={source.title}>
            <div className="flex flex-col gap-0.5">
              <span className="font-medium text-sm">{source.title}</span>
              <span className="text-xs text-muted-foreground line-clamp-2">
                {source.content.substring(0, 120)}...
              </span>
            </div>
          </Source>
        ))}
      </SourcesContent>
    </Sources>
  );
};
