import { NextResponse } from "next/server";
import {
  listSavedFilters,
  createSavedFilter,
  deleteSavedFilter,
} from "@/app/lib/db-saved-filters";
import { handleAction } from "@/app/lib/route-handler";

export async function GET() {
  return NextResponse.json({ filters: listSavedFilters() });
}

export async function POST(request: Request) {
  const body = await request.json();

  return handleAction(body, {
    "create": (b) => {
      const filter = createSavedFilter({
        name: b.name as string,
        filter_json: b.filter_json as object,
      });
      return { filter };
    },
    "delete": (b) => {
      deleteSavedFilter(b.id as string);
    },
  });
}
