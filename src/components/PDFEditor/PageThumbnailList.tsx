import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Trash2, Plus } from "lucide-react"
import type { LogicalPage } from "../../store/usePDFEditorStore"

const THUMB_W = 80
const THUMB_H = 110

interface ThumbnailProps {
  id: string
  label: string
  isBlank: boolean
  fileSrc: string
  pageNumber: number
  pageDims: { width: number; height: number }
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
}

function Thumbnail({ id, label, isBlank, fileSrc, pageNumber, pageDims, isActive, onSelect, onDelete }: ThumbnailProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const scale = THUMB_W / pageDims.width
  const scaledH = pageDims.height * scale

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group flex-shrink-0 cursor-pointer rounded-lg border-2 transition-colors overflow-hidden ${
        isActive ? "border-neon-cyan" : "border-dark-border hover:border-dark-border/80"
      }`}
      onClick={onSelect}
    >
      <div {...attributes} {...listeners} className="touch-none">
        {isBlank ? (
          <div style={{ width: THUMB_W, height: THUMB_H }} className="bg-white flex items-center justify-center">
            <span className="text-dark-muted text-xs">Blank</span>
          </div>
        ) : (
          <div style={{ width: THUMB_W, height: scaledH, overflow: "hidden", background: "white", position: "relative" }}>
            <iframe
              src={`${fileSrc}#page=${pageNumber}&toolbar=0&navpanes=0&scrollbar=0`}
              style={{
                border: "none",
                pointerEvents: "none",
                width: pageDims.width,
                height: pageDims.height,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }}
              title={`Thumbnail page ${pageNumber}`}
            />
          </div>
        )}
      </div>
      <div className="absolute bottom-0 left-0 right-0 bg-dark-bg/80 text-center py-0.5">
        <span className="text-dark-muted text-[10px]">{label}</span>
      </div>
      <button
        className="absolute top-1 right-1 w-5 h-5 rounded bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => { e.stopPropagation(); onDelete() }}
      >
        <Trash2 size={10} />
      </button>
    </div>
  )
}

interface Props {
  fileSrc: string
  logicalPages: LogicalPage[]
  pageDimensions: { width: number; height: number }[]
  currentPageIndex: number
  onSelectPage: (index: number) => void
  onReorderPages: (newOrder: number[]) => void
  onDeletePage: (index: number) => void
  onInsertBlankPage: (afterIndex: number) => void
}

export default function PageThumbnailList({
  fileSrc,
  logicalPages,
  pageDimensions,
  currentPageIndex,
  onSelectPage,
  onReorderPages,
  onDeletePage,
  onInsertBlankPage,
}: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const ids = logicalPages.map((_, i) => String(i))

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = ids.indexOf(String(active.id))
    const newIndex = ids.indexOf(String(over.id))
    const newOrder = arrayMove(Array.from({ length: logicalPages.length }, (_, i) => i), oldIndex, newIndex)
    onReorderPages(newOrder)
  }

  return (
    <div className="flex flex-col gap-2 h-full overflow-y-auto p-2 w-[100px] flex-shrink-0 bg-dark-surface border-r border-dark-border">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {logicalPages.map((page, i) => {
            const isBlank = page.type === "blank"
            const dims = isBlank
              ? { width: page.width, height: page.height }
              : (pageDimensions[page.originalIndex] ?? { width: 612, height: 792 })
            const pageNumber = isBlank ? 1 : page.originalIndex + 1

            return (
              <Thumbnail
                key={page.type === "original" ? `orig-${page.originalIndex}` : page.blankId}
                id={String(i)}
                label={`Page ${i + 1}`}
                isBlank={isBlank}
                fileSrc={fileSrc}
                pageNumber={pageNumber}
                pageDims={dims}
                isActive={i === currentPageIndex}
                onSelect={() => onSelectPage(i)}
                onDelete={() => onDeletePage(i)}
              />
            )
          })}
        </SortableContext>
      </DndContext>

      <button
        className="flex items-center justify-center gap-1 py-1.5 rounded-lg border border-dashed border-dark-border text-dark-muted hover:text-neon-cyan hover:border-neon-cyan/50 text-xs transition-colors"
        onClick={() => onInsertBlankPage(currentPageIndex)}
      >
        <Plus size={12} />
        Blank
      </button>
    </div>
  )
}
