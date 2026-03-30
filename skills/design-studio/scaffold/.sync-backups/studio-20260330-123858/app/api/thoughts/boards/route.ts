import { NextResponse } from "next/server";
import {
  createBoard,
  listBoards,
  updateBoard,
  deleteBoard,
  addBoardItem,
  removeBoardItem,
  getBoardItems,
} from "@/app/lib/db-thoughts";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const boardId = searchParams.get("board_id");

  if (boardId) {
    return NextResponse.json(getBoardItems(boardId));
  }

  return NextResponse.json(listBoards());
}

export async function POST(request: Request) {
  const body = await request.json();

  switch (body.action) {
    case "create-board": {
      const board = createBoard(body.board);
      return NextResponse.json({ ok: true, board });
    }
    case "update-board": {
      updateBoard(body.id, body.patch);
      return NextResponse.json({ ok: true });
    }
    case "delete-board": {
      deleteBoard(body.id);
      return NextResponse.json({ ok: true });
    }
    case "add-item": {
      addBoardItem(body.board_id, body.thought_id, body.x, body.y);
      return NextResponse.json({ ok: true });
    }
    case "remove-item": {
      removeBoardItem(body.board_id, body.thought_id);
      return NextResponse.json({ ok: true });
    }
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
