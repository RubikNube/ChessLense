import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMemo, useState } from "react";
import {
  VIEW_LAYOUT_NAVIGATION_COLUMN,
  VIEW_LAYOUT_REFERENCE_COLUMN,
} from "../../utils/appState.js";

const COLUMN_IDS = [
  VIEW_LAYOUT_NAVIGATION_COLUMN,
  VIEW_LAYOUT_REFERENCE_COLUMN,
];
const INTERACTIVE_SELECTOR =
  "button, a, input, select, textarea, [contenteditable='true']";

class LongPressPointerSensor extends PointerSensor {
  static activators = [
    {
      eventName: "onPointerDown",
      handler: ({ nativeEvent }) =>
        !nativeEvent.target.closest?.(INTERACTIVE_SELECTOR),
    },
  ];
}

class LongPressTouchSensor extends TouchSensor {
  static activators = [
    {
      eventName: "onTouchStart",
      handler: ({ nativeEvent }) =>
        !nativeEvent.target.closest?.(INTERACTIVE_SELECTOR),
    },
  ];
}

function findColumnId(layout, viewId) {
  return COLUMN_IDS.find((columnId) => layout[columnId].includes(viewId));
}

function moveView(layout, activeId, overId) {
  const sourceColumnId = findColumnId(layout, activeId);
  const targetColumnId = COLUMN_IDS.includes(overId)
    ? overId
    : findColumnId(layout, overId);

  if (!sourceColumnId || !targetColumnId) {
    return layout;
  }

  const sourceViewIds = layout[sourceColumnId];
  const sourceIndex = sourceViewIds.indexOf(activeId);
  const targetViewIds = layout[targetColumnId];
  const targetIndex = COLUMN_IDS.includes(overId)
    ? targetViewIds.length
    : targetViewIds.indexOf(overId);

  if (sourceIndex < 0 || targetIndex < 0) {
    return layout;
  }

  if (sourceColumnId === targetColumnId) {
    return {
      ...layout,
      [sourceColumnId]: arrayMove(sourceViewIds, sourceIndex, targetIndex),
    };
  }

  return {
    ...layout,
    [sourceColumnId]: sourceViewIds.filter((viewId) => viewId !== activeId),
    [targetColumnId]: [
      ...targetViewIds.slice(0, targetIndex),
      activeId,
      ...targetViewIds.slice(targetIndex),
    ],
  };
}

function SortableView({ viewId, label, children }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: viewId });

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        setActivatorNodeRef(node);
      }}
      className={`sortable-view${isDragging ? " sortable-view-dragging" : ""}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      aria-label={`Move ${label}. Hold for one second, then drag.`}
      title="Hold for one second, then drag to move this view"
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}

function ViewColumn({ columnId, viewIds, views }) {
  const { setNodeRef } = useDroppable({ id: columnId });

  return (
    <div
      ref={setNodeRef}
      className="info-column sortable-view-column"
      data-column={columnId}
    >
      <SortableContext items={viewIds} strategy={verticalListSortingStrategy}>
        {viewIds.map((viewId) => {
          const view = views[viewId];

          return view ? (
            <SortableView key={viewId} viewId={viewId} label={view.label}>
              {view.content}
            </SortableView>
          ) : null;
        })}
      </SortableContext>
    </div>
  );
}

function SortableViewLayout({ layout, onLayoutChange, views }) {
  const [activeViewId, setActiveViewId] = useState(null);
  const sensors = useSensors(
    useSensor(LongPressPointerSensor, {
      activationConstraint: { delay: 1000, tolerance: 6 },
    }),
    useSensor(LongPressTouchSensor, {
      activationConstraint: { delay: 1000, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const activeView = activeViewId ? views[activeViewId] : null;
  const visibleLayout = useMemo(
    () => ({
      [VIEW_LAYOUT_NAVIGATION_COLUMN]: layout[
        VIEW_LAYOUT_NAVIGATION_COLUMN
      ].filter((viewId) => views[viewId]),
      [VIEW_LAYOUT_REFERENCE_COLUMN]: layout[
        VIEW_LAYOUT_REFERENCE_COLUMN
      ].filter((viewId) => views[viewId]),
    }),
    [layout, views],
  );

  function handleDragStart(event) {
    setActiveViewId(event.active.id);
  }

  function handleDragEnd(event) {
    setActiveViewId(null);

    if (event.over && event.active.id !== event.over.id) {
      onLayoutChange(moveView(layout, event.active.id, event.over.id));
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveViewId(null)}
      accessibility={{
        screenReaderInstructions: {
          draggable:
            "To move a view, press Space or Enter. Use the arrow keys to choose a new position, then press Space or Enter to drop it.",
        },
      }}
    >
      <ViewColumn
        columnId={VIEW_LAYOUT_NAVIGATION_COLUMN}
        viewIds={visibleLayout[VIEW_LAYOUT_NAVIGATION_COLUMN]}
        views={views}
      />
      <ViewColumn
        columnId={VIEW_LAYOUT_REFERENCE_COLUMN}
        viewIds={visibleLayout[VIEW_LAYOUT_REFERENCE_COLUMN]}
        views={views}
      />
      <DragOverlay dropAnimation={null}>
        {activeView ? (
          <div className="sortable-view-overlay">Moving {activeView.label}</div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export default SortableViewLayout;
