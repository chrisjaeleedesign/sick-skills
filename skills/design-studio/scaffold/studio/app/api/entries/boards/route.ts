import { NextResponse } from "next/server";
import {
  listBoards,
  listBoardsWithPreviews,
  getBoard,
  getBoardItems,
  getBoardItemsEnriched,
  createBoard,
  updateBoard,
  deleteBoard,
  addBoardItem,
  removeBoardItem,
  updateBoardItemLayout,
  bulkUpdateBoardLayout,
} from "@/app/lib/db-boards";
import { handleAction } from "@/app/lib/route-handler";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (id) {
    const board = getBoard(id);
    if (!board) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (searchParams.get("enriched") === "true") {
      return NextResponse.json({ board, entries: getBoardItemsEnriched(id) });
    }
    return NextResponse.json({ board, items: getBoardItems(id) });
  }

  if (searchParams.get("preview") === "true") {
    return NextResponse.json({ boards: listBoardsWithPreviews() });
  }

  return NextResponse.json({ boards: listBoards() });
}

export async function POST(request: Request) {
  const body = await request.json();

  return handleAction(body, {
    "create-board": (b) => {
      const board = createBoard(b.board as Parameters<typeof createBoard>[0]);
      return { board };
    },
    "update-board": (b) => {
      updateBoard(b.id as string, b.patch as Parameters<typeof updateBoard>[1]);
    },
    "delete-board": (b) => {
      deleteBoard(b.id as string);
    },
    "add-item": (b) => {
      addBoardItem(
        b.board_id as string,
        b.entry_id as string,
        { x: b.x as number | undefined, y: b.y as number | undefined, w: b.w as number | undefined, h: b.h as number | undefined },
      );
    },
    "remove-item": (b) => {
      removeBoardItem(b.board_id as string, b.entry_id as string);
    },
    "update-board-item-layout": (b) => {
      updateBoardItemLayout(
        b.board_id as string,
        b.entry_id as string,
        b.layout as Parameters<typeof updateBoardItemLayout>[2],
      );
    },
    "bulk-update-board-layout": (b) => {
      bulkUpdateBoardLayout(
        b.board_id as string,
        b.items as Parameters<typeof bulkUpdateBoardLayout>[1],
      );
    },
  });
}
