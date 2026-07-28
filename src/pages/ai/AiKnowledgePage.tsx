import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  BookText,
  FileText,
  Loader2,
  Plus,
  ScrollText,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  PageHero,
  Panel,
  Pill,
  SegmentedControl,
  EmptyPanel,
  fieldInputClass,
  fieldTextareaClass,
} from "@/shared/ui/pulse";
import { Button, formatBytes, Timestamp } from "@/shared/observe";
import { AiErrorState, AiLoadingBlock } from "@/modules/ai/components/states";
import { normalizeAiError } from "@/modules/ai/lib/errors";
import { aiApi } from "@/modules/ai/api/ai.api";
import { aiQueryKeys, useActiveOrgId, useKnowledge } from "@/modules/ai/hooks/useAi";
import type { KnowledgeType } from "@/modules/ai/types";

const TYPE_FILTERS = [
  { value: "all", label: "All" },
  { value: "document", label: "Documents" },
  { value: "runbook", label: "Runbooks" },
  { value: "documentation", label: "Docs" },
];

const TYPE_META: Record<KnowledgeType, { icon: typeof FileText; label: string }> = {
  document: { icon: FileText, label: "Document" },
  runbook: { icon: ScrollText, label: "Runbook" },
  documentation: { icon: BookText, label: "Documentation" },
};

export default function AiKnowledgePage() {
  const orgId = useActiveOrgId();
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [showUpload, setShowUpload] = useState(false);

  // Upload form state
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState<KnowledgeType>("runbook");
  const [content, setContent] = useState("");

  const knowledge = useKnowledge({});
  const docs = knowledge.data ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return docs.filter((d) => {
      const matchesType = typeFilter === "all" || d.type === typeFilter;
      const matchesSearch = !q || d.title.toLowerCase().includes(q);
      return matchesType && matchesSearch;
    });
  }, [docs, typeFilter, search]);

  const upload = useMutation({
    mutationFn: () => aiApi.uploadKnowledge(orgId!, { title: title.trim(), type: docType, content }),
    onSuccess: () => {
      toast.success("Knowledge source added");
      setTitle("");
      setContent("");
      setShowUpload(false);
      queryClient.invalidateQueries({ queryKey: aiQueryKeys.knowledge(orgId ?? "none") });
    },
    onError: (err) => toast.error(normalizeAiError(err).message),
  });

  const remove = useMutation({
    mutationFn: (docId: string) => aiApi.deleteKnowledge(orgId!, docId),
    onSuccess: () => {
      toast.success("Source removed");
      queryClient.invalidateQueries({ queryKey: aiQueryKeys.knowledge(orgId ?? "none") });
    },
    onError: (err) => toast.error(normalizeAiError(err).message),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        eyebrow="Artificial Intelligence"
        title="AI Knowledge"
        description="Manage the runbooks and documentation the AI can cite. Grounded answers reference these sources."
        icon={BookOpen}
        actions={
          <Button variant="primary" onClick={() => setShowUpload((v) => !v)}>
            {showUpload ? <X className="size-4" /> : <Plus className="size-4" />}
            {showUpload ? "Cancel" : "Add source"}
          </Button>
        }
      />

      {showUpload && (
        <Panel title="Add knowledge source" icon={Upload} tone="ai">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] font-medium text-[var(--text2)]">Title</span>
                <input
                  className={fieldInputClass}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Payments incident runbook"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] font-medium text-[var(--text2)]">Type</span>
                <select
                  className={fieldInputClass}
                  value={docType}
                  onChange={(e) => setDocType(e.target.value as KnowledgeType)}
                >
                  <option value="runbook">Runbook</option>
                  <option value="document">Document</option>
                  <option value="documentation">Documentation</option>
                </select>
              </label>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-[var(--text2)]">Content</span>
              <textarea
                className={`${fieldTextareaClass} min-h-[160px]`}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste runbook or documentation content the AI should be able to reference…"
              />
            </label>
            <div className="flex justify-end">
              <Button
                variant="primary"
                onClick={() => upload.mutate()}
                disabled={upload.isPending || !title.trim() || !content.trim() || !orgId}
              >
                {upload.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Uploading…
                  </>
                ) : (
                  <>
                    <Upload className="size-4" /> Upload source
                  </>
                )}
              </Button>
            </div>
          </div>
        </Panel>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] p-2.5">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text3)]" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search knowledge…"
            className="h-9 w-full rounded-[8px] border border-[var(--border)] bg-[var(--bg2)] pl-9 pr-3 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text3)] focus:border-[var(--ai)]"
          />
        </div>
        <SegmentedControl
          ariaLabel="Filter by type"
          value={typeFilter}
          onChange={setTypeFilter}
          options={TYPE_FILTERS}
        />
      </div>

      {/* List */}
      {knowledge.isLoading ? (
        <AiLoadingBlock rows={3} />
      ) : knowledge.isError ? (
        <AiErrorState
          error={knowledge.error}
          unavailableTitle="Knowledge management not available"
          unavailableDescription="The knowledge base API isn't enabled in this environment yet. Once available, runbooks and documentation you add here will be searchable and citable by the AI."
        />
      ) : filtered.length === 0 ? (
        <EmptyPanel
          icon={BookOpen}
          title={docs.length === 0 ? "No knowledge sources yet" : "No matches"}
          description={
            docs.length === 0
              ? "Add runbooks and documentation so the AI can ground its answers in your operational knowledge."
              : "Try a different search or filter."
          }
          action={
            docs.length === 0 ? (
              <Button variant="primary" onClick={() => setShowUpload(true)}>
                <Plus className="size-4" /> Add source
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Panel bodyClassName="p-0">
          <ul className="divide-y divide-[var(--border)]">
            {filtered.map((doc) => {
              const meta = TYPE_META[doc.type] ?? TYPE_META.document;
              const Icon = meta.icon;
              return (
                <li key={doc.id} className="flex items-center gap-3 px-5 py-3.5">
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--bg2)] text-[var(--text2)] ring-1 ring-inset ring-[var(--border)]">
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[13.5px] font-medium text-[var(--text)]">{doc.title}</span>
                      <Pill tone="neutral">{meta.label}</Pill>
                    </div>
                    <div className="mt-0.5 flex items-center gap-3 text-[11.5px] text-[var(--text3)]">
                      {doc.version !== undefined && <span>v{doc.version}</span>}
                      {doc.sizeBytes !== undefined && <span>{formatBytes(doc.sizeBytes)}</span>}
                      {doc.updatedAt && (
                        <span>
                          Updated <Timestamp value={doc.updatedAt} />
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove.mutate(doc.id)}
                    disabled={remove.isPending}
                    className="text-[var(--text3)] transition-colors hover:text-[var(--red)] disabled:opacity-50"
                    aria-label={`Delete ${doc.title}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}
    </div>
  );
}
