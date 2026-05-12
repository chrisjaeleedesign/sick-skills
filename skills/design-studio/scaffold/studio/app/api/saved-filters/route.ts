import { NextResponse } from "next/server";
import {
  listSavedFilters,
  createSavedFilter,
  deleteSavedFilter,
} from "@/app/lib/db-saved-filters";
import { handleAction } from "@/app/lib/route-handler";
import { getProject } from "@/app/lib/request";

export async function GET(request: Request) {
  const project = getProject(request);
  return NextResponse.json({ filters: listSavedFilters(project) });
}

export async function POST(request: Request) {
  const body = await request.json();
  const project = getProject(request);

  return handleAction(body, {
    "create": (b) => {
      const filter = createSavedFilter({
        name: b.name as string,
        filter_json: b.filter_json as object,
        project: (b.project as string | undefined) ?? (project === "*" ? undefined : project),
      });
      return { filter };
    },
    "delete": (b) => {
      deleteSavedFilter(b.id as string);
    },
  });
}
