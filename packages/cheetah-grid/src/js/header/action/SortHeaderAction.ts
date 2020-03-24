import {
  CellAddress,
  EventListenerId,
  LayoutObjectId,
  ListGridAPI,
  SortColumnState,
  SortHeaderActionOption,
  SortOption,
  SortState
} from "../../ts-types";
import { BaseAction } from "./BaseAction";
import { bindCellClickAction } from "./actionBind";

export class SortHeaderAction<T> extends BaseAction<T> {
  private _sort: SortOption<T>;
  constructor(option: SortHeaderActionOption<T> = {}) {
    super(option);
    this._sort = option.sort ?? true;
  }
  get sort(): SortOption<T> {
    return this._sort;
  }
  set sort(sort) {
    this._sort = sort;
    this.onChangeDisabledInternal();
  }
  clone(): SortHeaderAction<T> {
    return new SortHeaderAction(this);
  }
  _executeSort(newState: SortColumnState, grid: ListGridAPI<T>): void {
    if (typeof this._sort === "function") {
      this._sort({
        order: newState.order || "asc",
        col: newState.col,
        row: newState.row,
        grid
      });
    } else {
      const fieldRow =
        Math.min(grid.recordRowCount - 1, newState.row) + grid.frozenRowCount;
      const field = grid.getField(newState.col, fieldRow);
      if (field == null) {
        return;
      }
      grid.dataSource.sort(field, newState.order || "asc");
    }
  }
  bindGridEvent(
    grid: ListGridAPI<T>,
    cellId: LayoutObjectId
  ): EventListenerId[] {
    function isTarget(col: number, row: number): boolean {
      return grid.getLayoutCellId(col, row) === cellId;
    }

    function findSortColumn(
      state: SortState,
      row: number
    ): SortColumnState | undefined {
      for (const sortColumnState of state) {
        if (isTarget(sortColumnState.col, row)) {
          return sortColumnState;
        }
      }
      return undefined;
    }

    const action = (cell: CellAddress, event: MouseEvent): void => {
      if (this.disabled) {
        return;
      }
      const state = grid.sortState as SortState;
      let newState: SortState;
      const range = grid.getCellRange(cell.col, cell.row);
      const sortColumn = findSortColumn(state, cell.row);
      let sortColumnForEvent: SortColumnState | undefined = undefined;
      if (event.ctrlKey) {
        newState = state;
        if (sortColumn) {
          if (sortColumn.order === "desc") {
            newState.splice(newState.indexOf(sortColumn), 1);
          } else {
            sortColumn.order = "desc";
            sortColumnForEvent = sortColumn;
          }
        } else {
          sortColumnForEvent = {
            col: range.start.col,
            row: range.start.row,
            order: "asc"
          };
          newState.push(sortColumnForEvent);
        }
      } else {
        if (sortColumn) {
          if (sortColumn.order === "desc") {
            newState = [];
          } else {
            sortColumnForEvent = {
              col: range.start.col,
              row: range.start.row,
              order: "desc"
            };
            newState = [sortColumnForEvent];
          }
        } else {
          sortColumnForEvent = {
            col: range.start.col,
            row: range.start.row,
            order: "asc"
          };
          newState = [sortColumnForEvent];
        }
      }
      grid.sortState = newState;
      if (!sortColumnForEvent) {
        // for backward compatibility
        sortColumnForEvent = { col: -1, row: -1, order: "asc" };
      }
      this._executeSort(sortColumnForEvent, grid);
      grid.invalidateGridRect(0, 0, grid.colCount - 1, grid.rowCount - 1);
    };

    return [
      ...bindCellClickAction(grid, cellId, {
        action,
        mouseOver: _e => {
          if (this.disabled) {
            return false;
          }
          return true;
        }
      })
    ];
  }
}
